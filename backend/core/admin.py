from django.contrib import admin
from core.models import Dataset, Cow, RawSensorRecord, FeatureSet, TrainedModel, Prediction, Explanation, Alert, Diagnosis

admin.site.register(Dataset)
admin.site.register(Cow)
admin.site.register(RawSensorRecord)
admin.site.register(FeatureSet)
admin.site.register(TrainedModel)
admin.site.register(Prediction)
admin.site.register(Explanation)
admin.site.register(Alert)
admin.site.register(Diagnosis)
