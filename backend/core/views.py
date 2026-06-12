import os
from datetime import datetime
from rest_framework import viewsets, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.contrib.auth import authenticate
from django.http import FileResponse

from core.models import Dataset, Cow, RawSensorRecord, FeatureSet, TrainedModel, Prediction, Explanation, Alert, Diagnosis
from core.serializers import (
    DatasetSerializer, CowSerializer, RawSensorRecordSerializer,
    FeatureSetSerializer, TrainedModelSerializer, PredictionSerializer,
    AlertSerializer, DiagnosisSerializer, RegisterSerializer, UserSerializer
)
from core.data_manager import DairyDataManager
from core.ml_service import DairyMLService


def _token_payload(user):
    token, _ = Token.objects.get_or_create(user=user)
    role = getattr(getattr(user, 'profile', None), 'role', None)
    return {'token': token.key, 'user': UserSerializer(user).data, 'role': role}


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a user with a role and return an auth token (FR-9.1, FR-9.2)."""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(_token_payload(user), status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Authenticate and return a token with the user's role (FR-9.1)."""
    user = authenticate(
        username=request.data.get('username'),
        password=request.data.get('password'),
    )
    if user is None:
        return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(_token_payload(user), status=status.HTTP_200_OK)


class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all().order_by('-created_at')
    serializer_class = DatasetSerializer

    @action(detail=False, methods=['post'])
    def generate(self, request):
        name = request.data.get('name', 'Synthetic Dairy Dataset')
        version = request.data.get('version', datetime.now().strftime('%Y%m%d_%H%M%S'))
        herd_size = int(request.data.get('herd_size', 30))
        duration_days = int(request.data.get('duration_days', 30))
        interval_minutes = int(request.data.get('interval_minutes', 15))

        try:
            dataset = DairyDataManager.generate_synthetic(
                name=name,
                version=version,
                herd_size=herd_size,
                duration_days=duration_days,
                interval_minutes=interval_minutes
            )
            serializer = self.get_serializer(dataset)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def import_public(self, request):
        name = request.data.get('name', 'Public Validation Dataset')
        version = request.data.get('version', f"pub_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        file_path = request.data.get('file_path', os.path.join(settings.BASE_DIR, 'data', 'public_cow_sensors.csv'))

        try:
            dataset = DairyDataManager.import_public_dataset(name, version, file_path)
            serializer = self.get_serializer(dataset)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def validate(self, request, pk=None):
        try:
            report = DairyDataManager.validate_data(pk)
            return Response(report, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def build_features(self, request, pk=None):
        try:
            count = DairyDataManager.build_features(pk)
            # Set this dataset as active
            Dataset.objects.all().update(is_active=False)
            Dataset.objects.filter(id=pk).update(is_active=True)
            return Response({'message': f'Successfully engineered features. Total records: {count}'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CowViewSet(viewsets.ModelViewSet):
    queryset = Cow.objects.all().order_by('cow_id')
    serializer_class = CowSerializer
    filterset_fields = ['breed', 'herd_id']

class TrainedModelViewSet(viewsets.ModelViewSet):
    queryset = TrainedModel.objects.all().order_by('-created_at')
    serializer_class = TrainedModelSerializer

    @action(detail=False, methods=['post'])
    def train(self, request):
        trait = request.data.get('trait')
        dataset_id = request.data.get('dataset_id')
        split_type = request.data.get('split_type', 'leave_cow_out')
        random_seed = int(request.data.get('random_seed', 42))

        if not trait or not dataset_id:
            return Response({'error': 'trait and dataset_id are required fields.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            eval_summary = DairyMLService.train_and_evaluate(
                trait=trait,
                dataset_id=dataset_id,
                split_type=split_type,
                random_seed=random_seed
            )
            return Response(eval_summary, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def evaluate_report(self, request):
        dataset_id = request.data.get('dataset_id')
        if not dataset_id:
            return Response({'error': 'dataset_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            all_evals = DairyMLService.run_comparative_evaluation_report(dataset_id)
            return Response(all_evals, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def download_plot(self, request):
        plot_path = os.path.join(settings.BASE_DIR, 'evaluation_exports', 'model_comparison_auc.png')
        if os.path.exists(plot_path):
            return FileResponse(open(plot_path, 'rb'), content_type='image/png')
        return Response({'error': 'Plot file not found. Run evaluate_report first.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def download_report(self, request):
        report_path = os.path.join(settings.BASE_DIR, 'evaluation_exports', 'comparative_evaluation_report.csv')
        if os.path.exists(report_path):
            return FileResponse(open(report_path, 'rb'), content_type='text/csv')
        return Response({'error': 'CSV report not found. Run evaluate_report first.'}, status=status.HTTP_404_NOT_FOUND)

class PredictionViewSet(viewsets.ModelViewSet):
    queryset = Prediction.objects.all().order_by('-created_at')
    serializer_class = PredictionSerializer

    @action(detail=False, methods=['post'])
    def predict_cow(self, request):
        cow_id = request.data.get('cow_id')
        timestamp_str = request.data.get('timestamp')
        trait = request.data.get('trait')

        if not cow_id or not timestamp_str or not trait:
            return Response({'error': 'cow_id, timestamp, and trait are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            prediction, alert = DairyMLService.make_prediction_and_explain(cow_id, timestamp, trait)
            
            serializer = self.get_serializer(prediction)
            alert_id = alert.id if alert else None
            return Response({
                'prediction': serializer.data,
                'alert_id': alert_id
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def batch_predict(self, request):
        date_str = request.data.get('date') # YYYY-MM-DD
        trait = request.data.get('trait')

        if not date_str or not trait:
            return Response({'error': 'date (YYYY-MM-DD) and trait are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Query active dataset
            active_dataset = Dataset.objects.filter(is_active=True).first()
            if not active_dataset:
                return Response({'error': 'No active dataset. Build features first.'}, status=status.HTTP_400_BAD_REQUEST)

            # Query all feature sets for this date
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            features_qs = FeatureSet.objects.filter(
                dataset=active_dataset,
                timestamp__date=parsed_date
            )
            
            if not features_qs.exists():
                return Response({'message': 'No features found for the selected date.'}, status=status.HTTP_200_OK)

            predictions_created = []
            alerts_created = 0
            
            # Predict for each feature set record (limit batch size to prevent long timeouts)
            # Take only the latest sample per cow for the requested date, or all hours
            for f in features_qs[:200]: # Cap at 200 records per batch for performance
                try:
                    prediction, alert = DairyMLService.make_prediction_and_explain(f.cow_id, f.timestamp, trait)
                    predictions_created.append(prediction.id)
                    if alert:
                        alerts_created += 1
                except Exception:
                    continue
                    
            return Response({
                'message': f'Completed batch predictions. Generated {len(predictions_created)} predictions and {alerts_created} alerts.',
                'prediction_ids': predictions_created
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all().order_by('-created_at')
    serializer_class = AlertSerializer
    filterset_fields = ['status', 'trait', 'cow']

    def update(self, request, *args, **kwargs):
        # Allow patching status
        instance = self.get_object()
        status_val = request.data.get('status')
        if status_val in ['new', 'acknowledged', 'resolved']:
            instance.status = status_val
            instance.save()
            return Response(self.get_serializer(instance).data)
        return Response({'error': 'Invalid status value'}, status=status.HTTP_400_BAD_REQUEST)

class DiagnosisViewSet(viewsets.ModelViewSet):
    queryset = Diagnosis.objects.all().order_by('-created_at')
    serializer_class = DiagnosisSerializer
