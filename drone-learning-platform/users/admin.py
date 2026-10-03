from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, LearningProgress


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'is_staff', 'created_at']
    list_filter = ['role', 'is_staff', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('额外信息', {'fields': ('role', 'avatar', 'phone')}),
    )


@admin.register(LearningProgress)
class LearningProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'page_progress', 'completed', 'time_spent_seconds', 'last_accessed']
    list_filter = ['completed', 'lesson']
    search_fields = ['user__username', 'lesson__title']
