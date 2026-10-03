from rest_framework import serializers
from .models import User, LearningProgress


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'avatar', 'phone']
        read_only_fields = ['id']


class LearningProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    lesson_number = serializers.IntegerField(source='lesson.number', read_only=True)

    class Meta:
        model = LearningProgress
        fields = ['id', 'lesson', 'lesson_title', 'lesson_number', 'page_progress', 'completed', 'time_spent_seconds', 'last_accessed']
        read_only_fields = ['id', 'last_accessed']
