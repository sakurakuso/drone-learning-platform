from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Module, Lesson, ContentPage, LessonSection
from .serializers import (
    ModuleListSerializer, ModuleDetailSerializer,
    LessonListSerializer, LessonDetailSerializer,
    ContentPageSerializer, LessonSectionSerializer
)


class ModuleViewSet(viewsets.ReadOnlyModelViewSet):
    """模块视图集（只读）"""
    queryset = Module.objects.all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ModuleDetailSerializer
        return ModuleListSerializer

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """获取所有模块摘要"""
        modules = self.get_queryset()
        serializer = self.get_serializer(modules, many=True)
        return Response(serializer.data)


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """课时视图集（只读）"""
    queryset = Lesson.objects.select_related('module').all()
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LessonDetailSerializer
        return LessonListSerializer

    @action(detail=False, methods=['get'])
    def by_module(self, request):
        """获取指定模块的所有课时"""
        module_id = request.query_params.get('module_id')
        if not module_id:
            return Response({'error': 'module_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        lessons = self.get_queryset().filter(module_id=module_id)
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def pages(self, request, pk=None):
        """获取课时的所有页面"""
        lesson = self.get_object()
        pages = lesson.pages.all()
        serializer = ContentPageSerializer(pages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        """获取课时的所有章节"""
        lesson = self.get_object()
        sections = lesson.sections.all()
        serializer = LessonSectionSerializer(sections, many=True)
        return Response(serializer.data)
