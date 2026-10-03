from rest_framework import serializers
from .models import Module, Lesson, ContentPage, LessonSection


class ContentPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentPage
        fields = ['id', 'page_number', 'image', 'thumbnail', 'raw_text']


class LessonSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonSection
        fields = ['id', 'title', 'content', 'order', 'content_type', 'video_url']


class LessonListSerializer(serializers.ModelSerializer):
    """课时列表序列化器（简化版）"""
    total_pages = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ['id', 'number', 'title', 'subtitle', 'duration_minutes', 'difficulty', 'total_pages']

    def get_total_pages(self, obj):
        return obj.pages.count()


class LessonDetailSerializer(serializers.ModelSerializer):
    """课时详情序列化器"""
    pages = ContentPageSerializer(many=True, read_only=True)
    sections = LessonSectionSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ['id', 'number', 'title', 'subtitle', 'duration_minutes', 'difficulty', 'pages', 'sections']


class ModuleListSerializer(serializers.ModelSerializer):
    """模块列表序列化器"""
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'title', 'subtitle', 'order', 'icon', 'lesson_count']

    def get_lesson_count(self, obj):
        return obj.lessons.count()


class ModuleDetailSerializer(serializers.ModelSerializer):
    """模块详情序列化器"""
    lessons = LessonListSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ['id', 'title', 'subtitle', 'order', 'icon', 'lessons']
