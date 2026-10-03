"""
Django management command to import FPV course content.

Usage:
    python manage.py import_content --source /path/to/course_compilation
"""
import os
import shutil
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from courses.models import Module, Lesson, ContentPage


# Module structure matching build_platform_compact.py
MODULES = [
    ("模块一 基础认知与安全", {1, 2, 3, 4}),
    ("模块二 组装与焊接", {5, 6, 7, 8, 9}),
    ("模块三 地面站模拟器与安全训练", {10, 11, 12}),
    ("模块四 真机飞行训练", {13, 14, 15, 16}),
    ("模块五 检修维护与课程总结", {19, 20, 21, 22}),
]

# Lesson metadata from the course
LESSON_INFO = {
    1: {"title": "穿越机类型结构与核心部件", "subtitle": "认识各类穿越机及其组成", "duration": 45, "difficulty": "beginner"},
    2: {"title": "打杆逻辑与模拟器", "subtitle": "遥控器操作基础与模拟器训练", "duration": 60, "difficulty": "beginner"},
    3: {"title": "组装工具与使用方法", "subtitle": "常用工具及焊接基础", "duration": 45, "difficulty": "intermediate"},
    4: {"title": "安全规范", "subtitle": "飞行安全与操作规范", "duration": 30, "difficulty": "beginner"},
    5: {"title": "焊接与基础组装", "subtitle": "电机焊接与基础组装", "duration": 60, "difficulty": "intermediate"},
    6: {"title": "机架与电源系统", "subtitle": "机架组装与电池使用", "duration": 45, "difficulty": "intermediate"},
    7: {"title": "飞控接线", "subtitle": "飞控安装与接线", "duration": 45, "difficulty": "intermediate"},
    8: {"title": "图传接收与天线", "subtitle": "图传系统安装调试", "duration": 30, "difficulty": "intermediate"},
    9: {"title": "整机收尾与检查", "subtitle": "整机检查与测试", "duration": 30, "difficulty": "intermediate"},
    10: {"title": "Betaflight 基础配置", "subtitle": "飞控软件基础设置", "duration": 60, "difficulty": "intermediate"},
    11: {"title": "Betaflight 进阶配置", "subtitle": "高级参数调整", "duration": 60, "difficulty": "advanced"},
    12: {"title": "模拟器训练与安全", "subtitle": "模拟器训练计划", "duration": 45, "difficulty": "beginner"},
    13: {"title": "试飞流程", "subtitle": "首次试飞步骤", "duration": 30, "difficulty": "intermediate"},
    14: {"title": "基础飞行训练", "subtitle": "基本飞行动作", "duration": 60, "difficulty": "intermediate"},
    15: {"title": "进阶动作训练", "subtitle": "高级飞行动作", "duration": 90, "difficulty": "advanced"},
    16: {"title": "综合训练", "subtitle": "综合飞行训练", "duration": 90, "difficulty": "advanced"},
    19: {"title": "检修方法", "subtitle": "常见问题诊断", "duration": 45, "difficulty": "intermediate"},
    20: {"title": "维修实操", "subtitle": "维修操作演示", "duration": 60, "difficulty": "intermediate"},
    21: {"title": "疑难故障处理", "subtitle": "复杂故障排除", "duration": 45, "difficulty": "advanced"},
    22: {"title": "复习与课程总结", "subtitle": "课程内容回顾", "duration": 60, "difficulty": "beginner"},
}


class Command(BaseCommand):
    help = 'Import FPV course content from source directory'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            required=True,
            help='Path to course_compilation directory'
        )
        parser.add_argument(
            '--copy-images',
            action='store_true',
            help='Copy images to media directory'
        )

    def handle(self, *args, **options):
        source_dir = Path(options['source'])
        if not source_dir.exists():
            raise CommandError(f'Source directory does not exist: {source_dir}')

        self.stdout.write('Starting course content import...')

        # Import modules and lessons
        self.import_modules_and_lessons()

        # Import content pages if rendered images exist
        rendered_dir = source_dir / 'rendered_final'
        if rendered_dir.exists():
            self.import_content_pages(rendered_dir, options.get('copy_images', False))
        else:
            self.stdout.write(
                self.style.WARNING(f'rendered_final not found at {rendered_dir}, skipping page import')
            )

        self.stdout.write(self.style.SUCCESS('Import completed successfully!'))

    def import_modules_and_lessons(self):
        """Create Module and Lesson records."""
        created_modules = 0
        created_lessons = 0

        for order, (module_name, lesson_numbers) in enumerate(MODULES, start=1):
            # Create or get module
            module, created = Module.objects.get_or_create(
                title=module_name,
                defaults={
                    'subtitle': self.get_module_subtitle(module_name),
                    'order': order,
                    'icon': self.get_module_icon(order)
                }
            )
            if created:
                created_modules += 1
                self.stdout.write(f'  Created module: {module_name}')
            else:
                self.stdout.write(f'  Module exists: {module_name}')

            # Create lessons for this module
            for idx, lesson_number in enumerate(sorted(lesson_numbers), start=1):
                info = LESSON_INFO.get(lesson_number, {})
                lesson, created = Lesson.objects.get_or_create(
                    module=module,
                    number=lesson_number,
                    defaults={
                        'title': info.get('title', f'课时 {lesson_number}'),
                        'subtitle': info.get('subtitle', ''),
                        'order': idx,
                        'duration_minutes': info.get('duration', 30),
                        'difficulty': info.get('difficulty', 'beginner')
                    }
                )
                if created:
                    created_lessons += 1
                    self.stdout.write(f'    Created lesson {lesson_number}: {lesson.title}')

        self.stdout.write(
            self.style.SUCCESS(f'Created {created_modules} modules, {created_lessons} lessons')
        )

    def import_content_pages(self, rendered_dir, copy_images=False):
        """Import PNG pages from rendered_final directory."""
        media_pages_dir = Path('media/courses/pages')
        if copy_images:
            media_pages_dir = media_pages_dir.resolve()
            media_pages_dir.mkdir(parents=True, exist_ok=True)

        # Get all page-*.png files
        png_files = sorted(rendered_dir.glob('page-*.png'))
        self.stdout.write(f'Found {len(png_files)} PNG files in {rendered_dir}')

        # Map pages to lessons based on page ranges
        # Based on course structure: ~227 pages for 20 lessons
        # Approximate page distribution:
        page_ranges = self.calculate_page_ranges()

        imported_count = 0
        for png_file in png_files:
            # Extract page number
            try:
                page_num = int(png_file.stem.split('-')[1])
            except (IndexError, ValueError):
                self.stdout.write(
                    self.style.WARNING(f'  Skipping file with unexpected name: {png_file.name}')
                )
                continue

            # Find corresponding lesson
            lesson = self.find_lesson_for_page(page_num, page_ranges)
            if not lesson:
                self.stdout.write(
                    self.style.WARNING(f'  No lesson found for page {page_num}')
                )
                continue

            # Calculate page index within lesson
            lesson_start, lesson_end = page_ranges.get(lesson.number, (page_num, page_num))
            page_index = page_num - lesson_start + 1

            if copy_images:
                # Copy image to media directory
                dest_path = media_pages_dir / f'{lesson.number:02d}_{page_index:03d}.png'
                shutil.copy2(png_file, dest_path)
                image_name = f'courses/pages/{lesson.number:02d}_{page_index:03d}.png'
            else:
                # Use original path
                image_name = str(png_file)

            # Create content page record
            _, created = ContentPage.objects.get_or_create(
                lesson=lesson,
                page_number=page_index,
                defaults={'image': image_name}
            )
            if created:
                imported_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Created {imported_count} content page records')
        )

    def calculate_page_ranges(self):
        """Calculate approximate page ranges for each lesson."""
        # Based on analysis: 227 pages for 20 lessons
        # Distribute pages roughly proportional to lesson content
        lesson_page_counts = {
            1: 12, 2: 14, 3: 10, 4: 8,   # Module 1: ~44 pages
            5: 12, 6: 12, 7: 12, 8: 10, 9: 10,  # Module 2: ~56 pages
            10: 14, 11: 14, 12: 10,  # Module 3: ~38 pages
            13: 10, 14: 14, 15: 16, 16: 14,  # Module 4: ~54 pages
            19: 12, 20: 14, 21: 12, 22: 10,  # Module 5: ~48 pages
        }

        ranges = {}
        current_page = 1
        for lesson_num in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22]:
            count = lesson_page_counts.get(lesson_num, 10)
            ranges[lesson_num] = (current_page, current_page + count - 1)
            current_page += count

        return ranges

    def find_lesson_for_page(self, page_num, page_ranges):
        """Find which lesson a page number belongs to."""
        for lesson_num, (start, end) in page_ranges.items():
            if start <= page_num <= end:
                return Lesson.objects.filter(number=lesson_num).first()
        return None

    def get_module_subtitle(self, module_name):
        subtitles = {
            "模块一 基础认知与安全": "了解穿越机基础知识与安全规范",
            "模块二 组装与焊接": "学习穿越机各部件组装与焊接技术",
            "模块三 地面站模拟器与安全训练": "掌握地面站软件与模拟器训练",
            "模块四 真机飞行训练": "真机飞行操作与训练",
            "模块五 检修维护与课程总结": "故障检修与课程总结",
        }
        return subtitles.get(module_name, "")

    def get_module_icon(self, order):
        icons = {
            1: "el-icon-reading",
            2: "el-icon-tools",
            3: "el-icon-monitor",
            4: "el-icon-video-play",
            5: "el-icon-setting",
        }
        return icons.get(order, "el-icon-document")
