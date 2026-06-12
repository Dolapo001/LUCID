from django.core.management.base import BaseCommand
from core.data_manager import DairyDataManager
from core.ml_service import DairyMLService
from core.models import Dataset, Cow, FeatureSet, TrainedModel, Prediction, Explanation, Alert
from datetime import datetime

class Command(BaseCommand):
    help = 'Runs the complete precision dairy ML pipeline: data generation, feature engineering, model training, and evaluation.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting Precision Dairy ML Pipeline..."))

        # 1. Generate Synthetic Dataset
        # 30 cows over 21 days gives enough animals for a leave-cow-out split to
        # contain positive cases for the rarer traits (mastitis, calving).
        self.stdout.write("Generating synthetic dataset (30 cows, 21 days)...")
        dataset = DairyDataManager.generate_synthetic(
            name="Seed Synthetic Dataset",
            version="seed_synthetic_v1",
            herd_size=30,
            duration_days=21,
            interval_minutes=15
        )
        self.stdout.write(self.style.SUCCESS(f"Generated dataset ID: {dataset.id}, version: {dataset.version}"))

        # 2. Validate Dataset
        self.stdout.write("Validating dataset data quality...")
        validation_report = DairyDataManager.validate_data(dataset.id)
        self.stdout.write(f"Validation Report: {validation_report}")

        # 3. Build Features
        self.stdout.write("Building rolling and deviation features...")
        feat_count = DairyDataManager.build_features(dataset.id)
        self.stdout.write(self.style.SUCCESS(f"Feature set built. Total feature rows: {feat_count}"))

        # 4. Run Comparative Evaluation Report
        self.stdout.write("Training and evaluating all traits (estrus, mastitis, heat stress, calving)...")
        eval_reports = DairyMLService.run_comparative_evaluation_report(dataset.id)
        self.stdout.write(self.style.SUCCESS("Comparative evaluation report and AUC plot generated successfully!"))
        
        for rep in eval_reports:
            self.stdout.write(f"\nTrait: {rep['trait']}")
            self.stdout.write(f"  AUC Gap (BB - Interp): {rep['auc_gap']:.4f}")
            self.stdout.write(f"  Explanation Stability: {rep['explanation_stability']:.2f}")
            for alg, details in rep['results'].items():
                m = details['metrics']
                bc = m['biological_consistency']
                self.stdout.write(f"    * {alg} ({details['family']}): AUC={m['roc_auc']:.2f}, F1={m['f1']:.2f}, Consistent={bc['is_consistent']}")

        # 5. Import Public Dataset (Validation)
        self.stdout.write("\nImporting public validation dataset...")
        import os
        from django.conf import settings
        public_csv = os.path.join(settings.BASE_DIR, 'data', 'public_cow_sensors.csv')
        pub_dataset = DairyDataManager.import_public_dataset("Seed Public Dataset", "seed_public_v1", public_csv)
        self.stdout.write(self.style.SUCCESS(f"Imported public dataset. Version: {pub_dataset.version}"))
        
        # 6. Test Single Inference Prediction & Explanation
        self.stdout.write("\nRunning sample single-cow prediction & explanation test...")
        first_feat = FeatureSet.objects.filter(dataset=dataset).first()
        if first_feat:
            pred, alert = DairyMLService.make_prediction_and_explain(first_feat.cow_id, first_feat.timestamp, 'estrus')
            explanation = Explanation.objects.get(prediction=pred)
            self.stdout.write(self.style.SUCCESS("Inference and explanation completed successfully!"))
            self.stdout.write(f"  Cow: {first_feat.cow_id}")
            self.stdout.write(f"  Prediction Score: {pred.score:.4f} (Label: {pred.label})")
            self.stdout.write(f"  Explanation: {explanation.human_readable_text}")
            if alert:
                self.stdout.write(self.style.WARNING(f"  Alert Created! ID: {alert.id}"))
        else:
            self.stdout.write(self.style.ERROR("No features available for prediction test."))

        # 7. Seed herd-wide predictions & alerts so the dashboard has live data.
        #    For each cow we take its most recent window and predict every trait.
        self.stdout.write("\nSeeding herd-wide predictions and alerts...")
        traits = ['estrus', 'mastitis_risk', 'heat_stress', 'calving_imminent']
        seeded_predictions = 0
        seeded_alerts = 0
        for cow_id in FeatureSet.objects.filter(dataset=dataset).values_list('cow_id', flat=True).distinct():
            latest = (FeatureSet.objects.filter(dataset=dataset, cow_id=cow_id)
                      .order_by('-timestamp').first())
            if not latest:
                continue
            for trait in traits:
                try:
                    _, alert = DairyMLService.make_prediction_and_explain(cow_id, latest.timestamp, trait)
                    seeded_predictions += 1
                    if alert:
                        seeded_alerts += 1
                except Exception:
                    continue
        self.stdout.write(self.style.SUCCESS(
            f"Seeded {seeded_predictions} predictions and {seeded_alerts} alerts."
        ))

        self.stdout.write(self.style.SUCCESS("\nPipeline execution complete! All outputs saved."))
