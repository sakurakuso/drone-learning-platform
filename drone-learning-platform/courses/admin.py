from django.contrib import admin
from .models import Module, Lesson, ContentPage, LessonSection


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ['title', 'order', 'created_at']
    search_fields = ['title', 'subtitle']
    ordering = ['order']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'module', 'difficulty', 'duration_minutes', 'order']
    list_filter = ['module', 'difficulty']
    search_fields = ['title', 'subtitle']
    ordering = ['module', 'order']


@admin.register(ContentPage)
class ContentPageAdmin(admin.ModelAdmin):
    list_display = ['lesson', 'page_number', 'image', 'created_at']
    list_filter = ['lesson']
    search_fields = ['raw_text']
    ordering = ['lesson', 'page_number']


@admin.register(LessonSection)
class LessonSectionAdmin(admin.ModelAdmin):
    list_display = ['lesson', 'title', 'content_type', 'order']
    list_filter = ['lesson', 'content_type']
    search_fields = ['title', 'content']
    ordering = ['lesson', 'order']
