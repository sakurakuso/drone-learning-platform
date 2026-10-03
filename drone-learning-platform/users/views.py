from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import LearningProgress
from .serializers import LearningProgressSerializer


class LearningProgressViewSet(viewsets.ModelViewSet):
    """学习进度视图集"""
    serializer_class = LearningProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LearningProgress.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def by_lesson(self, request):
        """获取指定课时的学习进度"""
        lesson_id = request.query_params.get('lesson_id')
        if not lesson_id:
            return Response({'error': 'lesson_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        progress = self.get_queryset().filter(lesson_id=lesson_id).first()
        if progress:
            serializer = self.get_serializer(progress)
            return Response(serializer.data)
        return Response({'lesson_id': lesson_id, 'page_progress': 0, 'completed': False})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """获取学习进度摘要"""
        queryset = self.get_queryset()
        total_lessons = queryset.count()
        completed_lessons = queryset.filter(completed=True).count()
        return Response({
            'total_lessons': total_lessons,
            'completed_lessons': completed_lessons,
            'progress_percentage': (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
        })

    @action(detail=False, methods=['post'])
    def update_progress(self, request):
        """更新学习进度"""
        lesson_id = request.data.get('lesson_id')
        page = request.data.get('page_progress', 0)
        time_spent = request.data.get('time_spent_seconds', 0)
        completed = request.data.get('completed', False)

        if not lesson_id:
            return Response({'error': 'lesson_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        progress, _ = LearningProgress.objects.update_or_create(
            user=request.user,
            lesson_id=lesson_id,
            defaults={
                'page_progress': page,
                'time_spent_seconds': time_spent,
                'completed': completed
            }
        )
        serializer = self.get_serializer(progress)
        return Response(serializer.data)
