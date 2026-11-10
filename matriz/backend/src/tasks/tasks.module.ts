import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

/** Módulo Tarefas e comentários (`tasks`, architecture.md); para já, só as tarefas. */
@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
