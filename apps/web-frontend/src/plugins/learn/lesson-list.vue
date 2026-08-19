<template>
<div class="learn">
  <div class="pa-3 pb-1">
    <div class="text-h6 white--text">배우기</div>
    <div class="text-caption grey--text">
      읽고, 하늘에서 바로 확인합니다. 설명에 맞춰 하늘이 움직입니다.
    </div>
  </div>

  <v-list dense class="transparent">
    <v-list-item v-for="l in lessons" :key="l.id" :to="'/p/learn/' + l.id" class="lesson-item">
      <v-list-item-content>
        <v-list-item-title class="white--text">{{ l.title }}</v-list-item-title>
        <v-list-item-subtitle class="text-caption">{{ l.subtitle }}</v-list-item-subtitle>
        <div class="text-caption grey--text mt-1">
          <span class="badge">{{ l.level }}</span>
          <span class="ml-2">{{ l.minutes }}분</span>
          <span class="ml-2">{{ l.tags.join(' · ') }}</span>
        </div>
      </v-list-item-content>
    </v-list-item>
  </v-list>

  <div v-if="!lessons.length" class="pa-3 text-caption grey--text">
    아직 준비된 레슨이 없습니다.
  </div>
</div>
</template>

<script>
import index from './content/index.json'

export default {
  data: function () {
    return { lessons: index.lessons }
  }
}
</script>

<style scoped>
.learn { height: 100%; overflow-y: auto; }
.lesson-item { border-bottom: 1px solid rgba(255,255,255,0.06); }
.badge {
  background: rgba(100,181,246,0.2); color: #90caf9;
  padding: 1px 6px; border-radius: 3px; font-size: 11px;
}
</style>
