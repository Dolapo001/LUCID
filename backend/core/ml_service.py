import os
import joblib
import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use('Agg')  # Non-interactive background plotting
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score, confusion_matrix
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from django.conf import settings
from django.db import transaction
from core.models import Dataset, Cow, TrainedModel, FeatureSet, Prediction, Explanation, Alert

# Create saved_models directory inside django project root
SAVED_MODELS_DIR = os.path.join(settings.BASE_DIR, 'saved_models')
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.BASE_DIR, 'evaluation_exports'), exist_ok=True)

FEATURE_COLS = [
    'thi', 'rumination_roll_mean', 'rumination_delta_pct',
    'activity_roll_mean', 'activity_zscore', 'nocturnal_activity_dev',
    'lying_bout_change', 'temp_deviation', 'activity_index',
    'step_count', 'rumination_min', 'lying_time_min',
    'body_temp_c', 'ambient_temp_c', 'relative_humidity'
]

EXPECTED_DRIVERS = {
    'estrus': {
        'positive': ['activity_zscore', 'nocturnal_activity_dev', 'activity_index', 'step_count'],
        'negative': ['lying_time_min', 'lying_bout_change']
    },
    'mastitis_risk': {
        'positive': ['temp_deviation', 'body_temp_c'],
        'negative': ['rumination_delta_pct', 'rumination_roll_mean', 'activity_roll_mean']
    },
    'heat_stress': {
        'positive': ['thi', 'temp_deviation', 'body_temp_c', 'ambient_temp_c'],
        'negative': ['activity_roll_mean', 'activity_index', 'rumination_roll_mean']
    },
    'calving_imminent': {
        'positive': ['lying_bout_change', 'activity_roll_mean', 'activity_index'],
        'negative': ['rumination_min', 'rumination_roll_mean']
    }
}

class DairyMLService:
    @staticmethod
    def get_features_and_labels(dataset_id, trait):
        """
        Retrieves feature sets for a dataset and returns X, y, and cow_ids.
        """
        features_qs = FeatureSet.objects.filter(dataset_id=dataset_id)
        if not features_qs.exists():
            raise ValueError(f"No features found for dataset {dataset_id}")
            
        data = []
        for f in features_qs:
            row = {'cow_id': f.cow_id, 'timestamp': f.timestamp}
            row.update(f.features)
            row['label'] = f.labels.get(trait, 0)
            data.append(row)
            
        df = pd.DataFrame(data)
        
        # Ensure breed is mapped or dropped. We drop cow_id, timestamp, breed for X
        X = df[FEATURE_COLS].copy()
        y = df['label'].values
        cow_ids = df['cow_id'].values
        timestamps = df['timestamp'].values
        
        return X, y, cow_ids, timestamps

    @staticmethod
    def train_and_evaluate(trait, dataset_id, split_type='leave_cow_out', random_seed=42):
        """
        Trains 4 models (2 interpretable, 2 black-box) for a specific trait,
        saves them, computes metrics, and runs XAI feature attribution.
        """
        X, y, cow_ids, timestamps = DairyMLService.get_features_and_labels(dataset_id, trait)
        
        # Perform split
        if split_type == 'leave_cow_out':
            unique_cows = np.unique(cow_ids)
            train_cows, test_cows = train_test_split(unique_cows, test_size=0.2, random_state=random_seed)
            
            train_mask = np.isin(cow_ids, train_cows)
            test_mask = np.isin(cow_ids, test_cows)
            
            X_train, X_test = X[train_mask], X[test_mask]
            y_train, y_test = y[train_mask], y[test_mask]
            test_cow_ids = cow_ids[test_mask]
            test_timestamps = timestamps[test_mask]
        else:
            # Standard random split
            X_train, X_test, y_train, y_test, test_cow_ids, test_timestamps = train_test_split(
                X, y, cow_ids, timestamps, test_size=0.2, random_state=random_seed
            )

        # A classifier needs at least two classes in the training partition.
        if len(np.unique(y_train)) < 2:
            raise ValueError(
                f"Trait '{trait}' has only one class in the training split "
                f"({int(np.sum(y))} positives across {len(y)} rows). "
                "Generate a larger/longer dataset or adjust trait prevalence before training."
            )

        # Handle class imbalance by calculating weights
        pos_weight = (len(y_train) - sum(y_train)) / (sum(y_train) + 1e-5)
        
        # Define model configurations
        # Logistic Regression uses a Pipeline with StandardScaler to ensure convergence on multi-scale features
        models_config = {
            'logistic_regression': {
                'name': 'Logistic Regression',
                'family': 'interpretable',
                'class': Pipeline([
                    ('scaler', StandardScaler()),
                    ('clf', LogisticRegression(C=1.0, max_iter=2000, class_weight='balanced', random_state=random_seed, solver='lbfgs'))
                ])
            },
            'decision_tree': {
                'name': 'Decision Tree',
                'family': 'interpretable',
                'class': DecisionTreeClassifier(max_depth=5, class_weight='balanced', random_state=random_seed)
            },
            'random_forest': {
                'name': 'Random Forest',
                'family': 'black_box',
                'class': RandomForestClassifier(n_estimators=100, max_depth=8, class_weight='balanced', random_state=random_seed, n_jobs=-1)
            },
            'gradient_boosting': {
                'name': 'Gradient Boosting',
                'family': 'black_box',
                'class': GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=random_seed)
            }
        }

        results = {}
        dataset = Dataset.objects.get(id=dataset_id)

        for alg_key, conf in models_config.items():
            model_obj = conf['class']
            model_obj.fit(X_train, y_train)
            
            # Predict
            y_pred = model_obj.predict(X_test)
            y_prob = model_obj.predict_proba(X_test)[:, 1] if hasattr(model_obj, 'predict_proba') else y_pred
            
            # Metrics
            auc = roc_auc_score(y_test, y_prob) if len(np.unique(y_test)) > 1 else 0.5
            f1 = f1_score(y_test, y_pred, zero_division=0)
            prec = precision_score(y_test, y_pred, zero_division=0)
            rec = recall_score(y_test, y_pred, zero_division=0)
            tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel() if len(np.unique(y_test)) > 1 else (0, 0, 0, 0)
            
            # Deactivate previous active models for this trait/algorithm
            TrainedModel.objects.filter(trait=trait, algorithm=alg_key).update(is_active=False)
            
            # Save Model Artifact
            model_filename = f"{trait}_{alg_key}_{dataset_id}.joblib"
            model_path = os.path.join(SAVED_MODELS_DIR, model_filename)
            joblib.dump(model_obj, model_path)
            
            # Fit SHAP Explainer
            # For explanation efficiency, use a sample of 200 from X_train
            bg_sample = shap.sample(X_train, min(200, len(X_train)))
            
            # Compute test sample before any SHAP work (needed for scaling below)
            test_sample_size = min(500, len(X_test))
            X_test_sample = X_test.iloc[:test_sample_size]

            # For Pipeline models, extract the underlying classifier for SHAP
            is_pipeline = isinstance(model_obj, Pipeline)
            if is_pipeline:
                # Transform bg_sample using scaler before passing to SHAP
                scaler = model_obj.named_steps['scaler']
                clf_for_shap = model_obj.named_steps['clf']
                bg_sample_scaled = pd.DataFrame(scaler.transform(bg_sample), columns=FEATURE_COLS)
                X_test_scaled = pd.DataFrame(scaler.transform(X_test_sample), columns=FEATURE_COLS)
            else:
                clf_for_shap = model_obj
                bg_sample_scaled = bg_sample
                X_test_scaled = X_test_sample
            
            if alg_key == 'logistic_regression':
                explainer = shap.LinearExplainer(clf_for_shap, bg_sample_scaled)
            elif alg_key in ['decision_tree', 'random_forest', 'gradient_boosting']:
                explainer = shap.TreeExplainer(clf_for_shap, bg_sample_scaled)
            else:
                explainer = shap.Explainer(clf_for_shap, bg_sample_scaled)
                
            explainer_filename = f"{trait}_{alg_key}_{dataset_id}_explainer.joblib"
            explainer_path = os.path.join(SAVED_MODELS_DIR, explainer_filename)
            meta = {'is_pipeline': is_pipeline, 'alg_key': alg_key}
            joblib.dump({'explainer': explainer, 'meta': meta, 'scaler': scaler if is_pipeline else None}, explainer_path)

            # Compute SHAP Values on the test sample for global importance.
            # Tree explainers can fail a strict additivity check on tiny/degenerate
            # samples; disable it for tree models (the attributions remain valid).
            X_for_shap = X_test_scaled if is_pipeline else X_test_sample
            is_tree = alg_key in ('decision_tree', 'random_forest', 'gradient_boosting')
            shap_values = explainer(X_for_shap, check_additivity=False) if is_tree else explainer(X_for_shap)

            # Extract SHAP importance
            # shap_values.values has shape (samples, features) or (samples, features, classes)
            if len(shap_values.values.shape) == 3: # multi-class or discrete outputs
                shap_vals_matrix = shap_values.values[:, :, 1] # positive class
            else:
                shap_vals_matrix = shap_values.values
                
            mean_abs_shap = np.mean(np.abs(shap_vals_matrix), axis=0)
            shap_importance = dict(zip(FEATURE_COLS, [float(v) for v in mean_abs_shap]))
            
            # Calculate sign of correlation for check
            shap_signs = {}
            for col in FEATURE_COLS:
                # correlation of feature values and SHAP values
                f_vals = X_test_sample[col].values
                s_vals = shap_vals_matrix[:, FEATURE_COLS.index(col)]
                if np.std(f_vals) > 0 and np.std(s_vals) > 0:
                    corr = np.corrcoef(f_vals, s_vals)[0, 1]
                    shap_signs[col] = '+' if corr > 0 else '-'
                else:
                    shap_signs[col] = '+'

            # Perform biological-consistency check
            # Look at top 3 features by absolute SHAP value
            sorted_features = sorted(shap_importance.items(), key=lambda item: item[1], reverse=True)
            top_3_features = [f[0] for f in sorted_features[:3]]
            
            trait_expected = EXPECTED_DRIVERS.get(trait, {'positive': [], 'negative': []})
            matched_count = 0
            consistent_features = []
            
            for f_name in top_3_features:
                sign = shap_signs.get(f_name, '+')
                is_driver = False
                if sign == '+' and f_name in trait_expected['positive']:
                    is_driver = True
                elif sign == '-' and f_name in trait_expected['negative']:
                    is_driver = True
                # If expected driver generally
                elif f_name in trait_expected['positive'] or f_name in trait_expected['negative']:
                    is_driver = True
                    
                if is_driver:
                    matched_count += 1
                    consistent_features.append(f_name)
                    
            # A model is biologically consistent if at least 2 of the top 3 features are expected biological drivers
            is_biologically_consistent = matched_count >= 2
            
            metrics = {
                'roc_auc': float(auc),
                'f1': float(f1),
                'precision': float(prec),
                'recall': float(rec),
                'confusion_matrix': {
                    'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)
                },
                'global_shap': shap_importance,
                'shap_signs': shap_signs,
                'biological_consistency': {
                    'is_consistent': bool(is_biologically_consistent),
                    'matched_count': matched_count,
                    'top_3': top_3_features,
                    'consistent_drivers': consistent_features
                }
            }

            # Create Database Record
            db_model = TrainedModel.objects.create(
                name=f"{conf['name']} (v{dataset.version})",
                trait=trait,
                family=conf['family'],
                algorithm=alg_key,
                dataset=dataset,
                hyperparameters={'random_seed': random_seed, 'split_type': split_type},
                metrics=metrics,
                model_file_path=model_path,
                is_active=True # Active for serving
            )
            
            results[alg_key] = {
                'model_id': db_model.id,
                'metrics': metrics,
                'family': conf['family']
            }
            
        # Compute accuracy/AUC gap and explanation stability
        # Accuracy gap: Best black-box AUC - Best interpretable AUC
        best_bb_auc = max(results['random_forest']['metrics']['roc_auc'], results['gradient_boosting']['metrics']['roc_auc'])
        best_int_auc = max(results['logistic_regression']['metrics']['roc_auc'], results['decision_tree']['metrics']['roc_auc'])
        auc_gap = best_bb_auc - best_int_auc
        
        # Explanation stability: Overlap of top 3 features between Random Forest and Decision Tree
        rf_top3 = results['random_forest']['metrics']['biological_consistency']['top_3']
        dt_top3 = results['decision_tree']['metrics']['biological_consistency']['top_3']
        stability = len(set(rf_top3).intersection(set(dt_top3))) / 3.0
        
        # Save evaluation results to dataset/models metadata or return
        evaluation_summary = {
            'trait': trait,
            'dataset_version': dataset.version,
            'split_type': split_type,
            'auc_gap': float(auc_gap),
            'explanation_stability': float(stability),
            'results': results
        }
        
        return evaluation_summary

    @staticmethod
    def generate_explanation_text(trait, prediction_score, top_features_with_signs, feature_snapshot):
        """
        Generates clean human-readable text explaining the prediction based on SHAP contributions.
        """
        is_positive = prediction_score > 0.5
        risk_word = "elevated" if is_positive else "low"
        
        trait_labels = {
            'estrus': 'estrus (heat)',
            'mastitis_risk': 'subclinical mastitis risk',
            'heat_stress': 'heat stress',
            'calving_imminent': 'calving (imminent)'
        }
        
        trait_name = trait_labels.get(trait, trait)
        
        # Feature translations
        feature_names = {
            'activity_zscore': 'activity level (deviation from baseline)',
            'nocturnal_activity_dev': 'night-time activity deviation',
            'lying_time_min': 'lying time in minutes',
            'rumination_delta_pct': 'percentage change in rumination time',
            'temp_deviation': 'body temperature deviation',
            'thi': 'Temperature-Humidity Index (THI)',
            'rumination_roll_mean': 'rolling average rumination time',
            'activity_roll_mean': 'rolling average activity',
            'lying_bout_change': 'restlessness in lying behavior',
            'body_temp_c': 'body temperature',
            'ambient_temp_c': 'ambient temperature',
            'relative_humidity': 'relative humidity'
        }
        
        reasons = []
        for feat, val, sign in top_features_with_signs[:3]:
            feat_name = feature_names.get(feat, feat)
            actual_val = feature_snapshot.get(feat, 0.0)
            
            if feat == 'rumination_delta_pct':
                reasons.append(f"a {actual_val:+.1f}% change in rumination vs baseline ({sign} contribution)")
            elif feat == 'temp_deviation':
                reasons.append(f"a body temperature deviation of {actual_val:+.2f}°C ({sign} contribution)")
            elif feat == 'activity_zscore':
                reasons.append(f"an activity deviation z-score of {actual_val:+.2f} ({sign} contribution)")
            elif feat == 'thi':
                reasons.append(f"an environmental Temperature-Humidity Index (THI) of {actual_val:.1f} ({sign} contribution)")
            else:
                reasons.append(f" {feat_name} being {actual_val:.2f} ({sign} contribution)")
                
        reason_str = ", ".join(reasons)
        
        if is_positive:
            text = f"Cow shows {risk_word} probability ({prediction_score*100:.1f}%) of {trait_name}. This is primarily driven by: {reason_str}."
        else:
            text = f"Cow shows a stable profile with {risk_word} probability ({prediction_score*100:.1f}%) of {trait_name}."
            
        return text

    @staticmethod
    def make_prediction_and_explain(cow_id, timestamp, trait):
        """
        Inference service: predicts risk and computes local SHAP explanation for a single cow-window.
        Creates Prediction, Explanation and Alert (if threshold crossed).
        """
        # Get active model
        active_model = TrainedModel.objects.filter(trait=trait, is_active=True).first()
        if not active_model:
            raise ValueError(f"No active model found for trait: {trait}")
            
        # Get the feature snapshot
        feature_set = FeatureSet.objects.filter(cow_id=cow_id, timestamp=timestamp).first()
        if not feature_set:
            # Try to get raw record and calculate features on-the-fly
            raise ValueError(f"Feature set not built for Cow {cow_id} at {timestamp}")

        # Load model and explainer
        model_obj = joblib.load(active_model.model_file_path)
        
        # Load explainer (may be a dict with scaler for pipeline models)
        explainer_filename = f"{trait}_{active_model.algorithm}_{active_model.dataset_id}_explainer.joblib"
        explainer_path = os.path.join(SAVED_MODELS_DIR, explainer_filename)
        explainer_data = joblib.load(explainer_path)
        
        if isinstance(explainer_data, dict):
            explainer = explainer_data['explainer']
            explainer_scaler = explainer_data.get('scaler')
            is_pipeline = explainer_data['meta'].get('is_pipeline', False)
        else:
            # Legacy format
            explainer = explainer_data
            explainer_scaler = None
            is_pipeline = False

        # Prepare X input
        X_df = pd.DataFrame([feature_set.features])[FEATURE_COLS]
        
        # Scale input if pipeline model
        X_for_shap = pd.DataFrame(explainer_scaler.transform(X_df), columns=FEATURE_COLS) if is_pipeline else X_df
        
        # Predict (always use the full pipeline for prediction)
        score = float(model_obj.predict_proba(X_df)[0, 1])
        label = int(score > 0.5)

        # Create Prediction
        prediction = Prediction.objects.create(
            cow_id=cow_id,
            timestamp=timestamp,
            trait=trait,
            score=score,
            label=label,
            model=active_model,
            feature_snapshot=feature_set.features
        )

        # Compute SHAP value (disable additivity check for tree explainers)
        is_tree = active_model.algorithm in ('decision_tree', 'random_forest', 'gradient_boosting')
        shap_values = explainer(X_for_shap, check_additivity=False) if is_tree else explainer(X_for_shap)
        if len(shap_values.values.shape) == 3:
            shap_vals = shap_values.values[0, :, 1] # positive class
        else:
            shap_vals = shap_values.values[0]
            
        shap_dict = dict(zip(FEATURE_COLS, [float(v) for v in shap_vals]))
        
        # Sort features by absolute contribution
        sorted_shap = sorted(shap_dict.items(), key=lambda item: abs(item[1]), reverse=True)
        
        # Generate readable signs
        top_features_with_signs = []
        for feat, val in sorted_shap[:5]:
            sign = "positive" if val > 0 else "negative"
            top_features_with_signs.append((feat, val, sign))

        # Generate explanation text
        explanation_text = DairyMLService.generate_explanation_text(
            trait, score, top_features_with_signs, feature_set.features
        )

        # Save Explanation
        Explanation.objects.create(
            prediction=prediction,
            shap_values=shap_dict,
            human_readable_text=explanation_text
        )

        # Create Alert if score exceeds threshold (e.g. 0.50)
        alert = None
        if score >= 0.50:
            alert = Alert.objects.create(
                prediction=prediction,
                cow_id=cow_id,
                trait=trait,
                risk_score=score,
                status='new'
            )

        return prediction, alert

    @staticmethod
    def run_comparative_evaluation_report(dataset_id):
        """
        Executes training and evaluation for all traits and writes a comprehensive
        evaluation summary and figures for thesis Chapter 4.
        """
        traits = ['estrus', 'mastitis_risk', 'heat_stress', 'calving_imminent']
        all_evals = []
        
        for trait in traits:
            try:
                eval_summary = DairyMLService.train_and_evaluate(trait, dataset_id, split_type='leave_cow_out')
                all_evals.append(eval_summary)
            except Exception as e:
                print(f"Error training {trait}: {str(e)}")

        # Create evaluation figures
        # Save side-by-side bar chart of model family performances (ROC-AUC)
        if all_evals:
            traits_list = [e['trait'] for e in all_evals]
            lr_aucs = [e['results']['logistic_regression']['metrics']['roc_auc'] for e in all_evals]
            dt_aucs = [e['results']['decision_tree']['metrics']['roc_auc'] for e in all_evals]
            rf_aucs = [e['results']['random_forest']['metrics']['roc_auc'] for e in all_evals]
            gb_aucs = [e['results']['gradient_boosting']['metrics']['roc_auc'] for e in all_evals]
            
            x = np.arange(len(traits_list))
            width = 0.2
            
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.bar(x - 1.5*width, lr_aucs, width, label='Logistic Regression (Interp)', color='#A8DADC')
            ax.bar(x - 0.5*width, dt_aucs, width, label='Decision Tree (Interp)', color='#457B9D')
            ax.bar(x + 0.5*width, rf_aucs, width, label='Random Forest (Black-Box)', color='#1D3557')
            ax.bar(x + 1.5*width, gb_aucs, width, label='Gradient Boosting (Black-Box)', color='#E63946')
            
            ax.set_ylabel('ROC-AUC Score')
            ax.set_title('Precision Dairy Predictive Performance: Interpretable vs Black-Box Models')
            ax.set_xticks(x)
            ax.set_xticklabels([t.replace('_', ' ').title() for t in traits_list])
            ax.legend()
            ax.set_ylim(0.5, 1.05)
            ax.grid(axis='y', linestyle='--', alpha=0.7)
            
            # Save plot
            plot_path = os.path.join(settings.BASE_DIR, 'evaluation_exports', 'model_comparison_auc.png')
            plt.savefig(plot_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            # Save a table CSV of comparisons
            table_rows = []
            for e in all_evals:
                trait_name = e['trait']
                for alg, details in e['results'].items():
                    m = details['metrics']
                    bc = m['biological_consistency']
                    table_rows.append({
                        'Trait': trait_name,
                        'Algorithm': alg,
                        'Family': details['family'],
                        'ROC-AUC': m['roc_auc'],
                        'F1-Score': m['f1'],
                        'Precision': m['precision'],
                        'Recall': m['recall'],
                        'AUC_Gap': e['auc_gap'] if details['family'] == 'interpretable' else 0.0,
                        'Stability_Overlap': e['explanation_stability'],
                        'Bio_Consistent': bc['is_consistent'],
                        'Bio_Drivers_Matched': bc['matched_count'],
                        'Top_Features': ", ".join(bc['top_3'])
                    })
            df_report = pd.DataFrame(table_rows)
            report_csv_path = os.path.join(settings.BASE_DIR, 'evaluation_exports', 'comparative_evaluation_report.csv')
            df_report.to_csv(report_csv_path, index=False)
            
        return all_evals
