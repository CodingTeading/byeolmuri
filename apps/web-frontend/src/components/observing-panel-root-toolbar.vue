// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>

<v-toolbar dark dense class="obspanel-toolbar">
  <!-- 패널만 닫고 하늘로 돌아간다. 최상위 주소(/)는 포털이라 여기서 쓰면 앱을 떠난다. -->
  <v-btn icon :to="$lpath('/sky')"><v-icon>mdi-close</v-icon></v-btn>
  <v-spacer></v-spacer>
</v-toolbar>

</template>

<script>
</script>

<style>
.obspanel-toolbar {
  background-color: #212121!important;
}
</style>
