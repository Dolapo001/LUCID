from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import DatasetViewSet, CowViewSet, TrainedModelViewSet, PredictionViewSet, AlertViewSet, DiagnosisViewSet

router = DefaultRouter()
router.register(r'datasets', DatasetViewSet, basename='dataset')
router.register(r'cows', CowViewSet, basename='cow')
router.register(r'models', TrainedModelViewSet, basename='model')
router.register(r'predictions', PredictionViewSet, basename='prediction')
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'diagnoses', DiagnosisViewSet, basename='diagnosis')

urlpatterns = [
    path('', include(router.urls)),
]
