from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LearningProgressViewSet

router = DefaultRouter()
router.register(r'progress', LearningProgressViewSet, basename='progress')

urlpatterns = [
    path('', include(router.urls)),
]
