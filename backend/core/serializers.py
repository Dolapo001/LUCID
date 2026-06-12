from rest_framework import serializers
from core.models import Dataset, Cow, RawSensorRecord, FeatureSet, TrainedModel, Prediction, Explanation, Alert, Diagnosis

class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = '__all__'

class CowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cow
        fields = '__all__'

class RawSensorRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawSensorRecord
        fields = '__all__'

class FeatureSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureSet
        fields = '__all__'

class TrainedModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainedModel
        fields = '__all__'

class ExplanationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Explanation
        fields = ['shap_values', 'human_readable_text', 'created_at']

class PredictionSerializer(serializers.ModelSerializer):
    explanation = ExplanationSerializer(read_only=True)
    class Meta:
        model = Prediction
        fields = ['id', 'cow', 'timestamp', 'trait', 'score', 'label', 'model', 'feature_snapshot', 'explanation', 'created_at']

class AlertSerializer(serializers.ModelSerializer):
    prediction = PredictionSerializer(read_only=True)
    cow_breed = serializers.CharField(source='cow.breed', read_only=True)
    class Meta:
        model = Alert
        fields = ['id', 'prediction', 'cow', 'cow_breed', 'trait', 'risk_score', 'status', 'created_at', 'updated_at']

class DiagnosisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnosis
        fields = '__all__'
