import uuid
from django.db import models


class Module(models.Model):
    """课程模块"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=100, verbose_name="模块标题")
    subtitle = models.CharField(max_length=200, blank=True, verbose_name="副标题")
    order = models.PositiveIntegerField(default=0, verbose_name="排序")
    icon = models.CharField(max_length=50, blank=True, verbose_name="图标类名")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name = "课程模块"
        verbose_name_plural = "课程模块"

    def __str__(self):
        return self.title


class Lesson(models.Model):
    """课时"""
    DIFFICULTY_CHOICES = [
        ('beginner', '初级'),
        ('intermediate', '中级'),
        ('advanced', '高级'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons', verbose_name="所属模块")
    number = models.PositiveIntegerField(verbose_name="课时编号")
    title = models.CharField(max_length=200, verbose_name="课时标题")
    subtitle = models.CharField(max_length=300, blank=True, verbose_name="课时副标题")
    order = models.PositiveIntegerField(default=0, verbose_name="排序")
    duration_minutes = models.PositiveIntegerField(default=30, verbose_name="预计时长(分钟)")
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner', verbose_name="难度")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['module', 'order']
        verbose_name = "课时"
        verbose_name_plural = "课时"

    def __str__(self):
        return f"{self.number}. {self.title}"


class ContentPage(models.Model):
    """内容页面（PNG图片）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='pages', verbose_name="所属课时")
    page_number = models.PositiveIntegerField(verbose_name="页码")
    image = models.ImageField(upload_to='courses/pages/', verbose_name="页面图片")
    thumbnail = models.ImageField(upload_to='courses/thumbnails/', blank=True, verbose_name="缩略图")
    raw_text = models.TextField(blank=True, verbose_name="提取的文本(用于搜索)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['lesson', 'page_number']
        verbose_name = "内容页面"
        verbose_name_plural = "内容页面"
        unique_together = ['lesson', 'page_number']

    def __str__(self):
        return f"{self.lesson.title} - 第{self.page_number}页"


class LessonSection(models.Model):
    """课时章节（富文本内容）"""
    CONTENT_TYPE_CHOICES = [
        ('text', '文本'),
        ('image', '图片'),
        ('video', '视频'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='sections', verbose_name="所属课时")
    title = models.CharField(max_length=200, blank=True, verbose_name="章节标题")
    content = models.TextField(blank=True, verbose_name="内容(Markdown)")
    order = models.PositiveIntegerField(default=0, verbose_name="排序")
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, default='text', verbose_name="内容类型")
    video_url = models.URLField(max_length=500, blank=True, verbose_name="视频URL")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['lesson', 'order']
        verbose_name = "课时章节"
        verbose_name_plural = "课时章节"

    def __str__(self):
        return f"{self.lesson.title} - {self.title or '章节'}"
