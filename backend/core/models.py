from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    """Role assignment for an auth user (FR-9.2)."""
    ROLE_CHOICES = [
        ('farmer', 'Farmer / Herd Manager'),
        ('veterinarian', 'Veterinarian'),
        ('researcher', 'Researcher'),
        ('administrator', 'Administrator'),
    ]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='farmer')

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class Dataset(models.Model):
    SOURCE_CHOICES = [
        ('synthetic', 'Synthetic (Literature-Calibrated)'),
        ('public', 'Public (Validation Dataset)'),
    ]
    name = models.CharField(max_length=100)
    version = models.CharField(max_length=50, unique=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (v{self.version})"

class Cow(models.Model):
    cow_id = models.CharField(max_length=50, primary_key=True)
    breed = models.CharField(max_length=50, default="White Fulani")
    herd_id = models.CharField(max_length=50, default="Herd_A")
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Baselines for synthetic data generation and deviation calculations
    baseline_activity = models.FloatField(default=50.0)
    baseline_rumination = models.FloatField(default=30.0)
    baseline_lying_time = models.FloatField(default=70.0)
    baseline_temp = models.FloatField(default=38.5)

    def __str__(self):
        return f"Cow {self.cow_id} ({self.breed})"

class RawSensorRecord(models.Model):
    cow = models.ForeignKey(Cow, on_delete=models.CASCADE, related_name='raw_sensor_records')
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='raw_sensor_records')
    timestamp = models.DateTimeField()
    activity_index = models.FloatField()
    step_count = models.IntegerField()
    rumination_min = models.FloatField()
    lying_time_min = models.FloatField()
    body_temp_c = models.FloatField()
    ambient_temp_c = models.FloatField()
    relative_humidity = models.FloatField()
    milk_yield = models.FloatField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['cow', 'timestamp']),
            models.Index(fields=['dataset', 'timestamp']),
        ]
        unique_together = ('cow', 'dataset', 'timestamp')

    def __str__(self):
        return f"{self.cow_id} @ {self.timestamp}"

class FeatureSet(models.Model):
    cow = models.ForeignKey(Cow, on_delete=models.CASCADE, related_name='feature_sets')
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='feature_sets')
    timestamp = models.DateTimeField()
    
    # JSON containing all rolling & deviation features
    # e.g., activity_roll_mean, activity_zscore, thi, rumination_delta_pct, etc.
    features = models.JSONField()
    
    # JSON containing binary labels for target traits:
    # e.g., {"estrus": 0, "mastitis_risk": 1, "heat_stress": 0, "calving_imminent": 0}
    labels = models.JSONField()

    class Meta:
        indexes = [
            models.Index(fields=['cow', 'timestamp']),
            models.Index(fields=['dataset', 'timestamp']),
        ]
        unique_together = ('cow', 'dataset', 'timestamp')

class TrainedModel(models.Model):
    FAMILY_CHOICES = [
        ('interpretable', 'Interpretable Model'),
        ('black_box', 'Black-Box Model'),
    ]
    TRAIT_CHOICES = [
        ('estrus', 'Estrus'),
        ('mastitis_risk', 'Subclinical Mastitis Risk'),
        ('heat_stress', 'Heat Stress'),
        ('calving_imminent', 'Calving Imminent'),
    ]
    name = models.CharField(max_length=100)
    trait = models.CharField(max_length=30, choices=TRAIT_CHOICES)
    family = models.CharField(max_length=20, choices=FAMILY_CHOICES)
    algorithm = models.CharField(max_length=50) # 'logistic_regression', 'decision_tree', 'random_forest', 'gradient_boosting'
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE)
    hyperparameters = models.JSONField(default=dict)
    metrics = models.JSONField(default=dict) # ROC-AUC, F1, precision, recall, confusion_matrix
    model_file_path = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} for {self.trait} ({self.algorithm})"

class Prediction(models.Model):
    cow = models.ForeignKey(Cow, on_delete=models.CASCADE, related_name='predictions')
    timestamp = models.DateTimeField()
    trait = models.CharField(max_length=30)
    score = models.FloatField() # probability risk score [0, 1]
    label = models.IntegerField() # 0 or 1
    model = models.ForeignKey(TrainedModel, on_delete=models.CASCADE)
    feature_snapshot = models.JSONField() # features used to make prediction
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['cow', 'timestamp']),
            models.Index(fields=['trait']),
        ]

class Explanation(models.Model):
    prediction = models.OneToOneField(Prediction, on_delete=models.CASCADE, related_name='explanation')
    shap_values = models.JSONField() # dict mapping feature names to SHAP attribution values
    human_readable_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Alert(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    ]
    prediction = models.ForeignKey(Prediction, on_delete=models.CASCADE, related_name='alerts')
    cow = models.ForeignKey(Cow, on_delete=models.CASCADE, related_name='alerts')
    trait = models.CharField(max_length=30)
    risk_score = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

class Diagnosis(models.Model):
    cow = models.ForeignKey(Cow, on_delete=models.CASCADE, related_name='diagnoses')
    alert = models.ForeignKey(Alert, on_delete=models.SET_NULL, null=True, blank=True, related_name='diagnoses')
    diagnosed_trait = models.CharField(max_length=30)
    is_confirmed = models.BooleanField()
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
