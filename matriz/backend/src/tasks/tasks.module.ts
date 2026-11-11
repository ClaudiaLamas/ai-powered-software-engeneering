import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

/** Módulo Tarefas e comentários (`tasks`, architecture.md). */
@Module({
  controllers: [TasksController, CommentsController],
  providers: [TasksService, CommentsService],
})
export class TasksModule {}
