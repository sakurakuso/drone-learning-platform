import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """用户"""
    ROLE_CHOICES = [
        ('student', '学员'),
        ('instructor', '讲师'),
        ('admin', '管理员'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student', verbose_name="角色")
    avatar = models.ImageField(upload_to='users/avatars/', blank=True, verbose_name="头像")
    phone = models.CharField(max_length=20, blank=True, verbose_name="手机号")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "用户"
        verbose_name_plural = "用户"

    def __str__(self):
        return self.username


class LearningProgress(models.Model):
    """学习进度"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress', verbose_name="用户")
    lesson = models.ForeignKey('courses.Lesson', on_delete=models.CASCADE, related_name='progress', verbose_name="课时")
    page_progress = models.PositiveIntegerField(default=0, verbose_name="当前页面")
    completed = models.BooleanField(default=False, verbose_name="是否完成")
    time_spent_seconds = models.PositiveIntegerField(default=0, verbose_name="学习时长(秒)")
    last_accessed = models.DateTimeField(auto_now=True, verbose_name="最后访问时间")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "学习进度"
        verbose_name_plural = "学习进度"
        unique_together = ['user', 'lesson']

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title}"
