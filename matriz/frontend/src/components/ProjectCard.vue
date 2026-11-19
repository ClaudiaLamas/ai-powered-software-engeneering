<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { ProjectSummary } from '@/api/types'
import { ARCHIVED_LABEL, PROJECT_ROLE_LABELS } from '@/projects/project-labels'
import ProgressIndicator from './ProgressIndicator.vue'

/**
 * Cartão de um projeto no ecrã inicial (US05): nome (ligação para o projeto,
 * que cobre o cartão inteiro), a função da conta, o progresso e, num projeto
 * arquivado, a indicação "Arquivado (só de leitura)" (CL3).
 */
defineProps<{ project: ProjectSummary }>()
</script>

<template>
  <li
    class="card project-card"
    :class="{ 'project-card-archived': project.status === 'ARCHIVED' }"
    data-test="project-card"
  >
    <div class="project-card-head">
      <RouterLink :to="{ name: 'project', params: { projectId: project.id } }" class="project-card-link">
        {{ project.name }}
      </RouterLink>
      <span class="badge" :class="`badge-role-${project.myRole.toLowerCase()}`">
        {{ PROJECT_ROLE_LABELS[project.myRole] }}
      </span>
    </div>
    <ProgressIndicator :progress="project.progress" :project-name="project.name" />
    <div class="project-card-foot">
      <span
        v-if="project.status === 'ARCHIVED'"
        class="badge badge-project-archived"
        data-test="archived"
        >{{ ARCHIVED_LABEL }}</span
      >
      <span class="project-card-arrow" aria-hidden="true">→</span>
    </div>
  </li>
</template>

<style scoped>
.project-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.project-card:hover,
.project-card:focus-within {
  border-color: var(--color-border-hover);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
}
/* O cartão inteiro é clicável, mas continua a ser uma só ligação. */
.project-card:focus-within {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.project-card-link:focus-visible {
  outline: none;
}
.project-card-link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}
.project-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2);
}
.project-card-link {
  color: var(--color-heading);
  font-size: var(--font-size-h3);
  font-weight: 600;
  text-decoration: none;
  min-width: 0;
  overflow-wrap: anywhere;
}
.project-card:hover .project-card-link {
  text-decoration: underline;
}
.project-card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  margin-top: auto;
}
.project-card-arrow {
  margin-left: auto;
  color: var(--color-text-muted);
  transition: transform 0.15s;
}
.project-card:hover .project-card-arrow {
  color: var(--color-accent);
  transform: translateX(3px);
}
.project-card-archived {
  background: var(--color-background);
  border-style: dashed;
}
.badge-role-manager {
  --badge-color: var(--color-accent);
  font-weight: 600;
}
.badge-role-member {
  background: transparent;
}
</style>
