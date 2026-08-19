// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>

<div class="secondary" style="position:absolute; width: 100%; height: 100%;">
  <v-container style="width: 100%; height: 100%;">
    <v-layout column align-center style="width: 100%; height: 100%;">
      <div class="text-h2" style="padding-top: 10%;"><img src="@/assets/images/logo.svg" width="92" height="92" alt="별무리 로고"/> 별무리</div>
      <div v-if="$store.state.wasmSupport" style="margin: auto;">
        <div style="display:flex; justify-content: center;">
          <p class="grey--text"><span>별무리를 여는 중…</span></p>
        </div>
        <div style="display:flex; justify-content: center;">
          <v-progress-circular indeterminate v-bind:size="70" v-bind:width="7"  class="grey--text"/>
        </div>
      </div>
      <v-card v-else style="margin: auto;">
        <v-card-title primary-title>
          <div class="text-h5"><h1>{{ $t('Could not show the Online Star Map') }}</h1></div>
          <div class="text-h5" style="margin-top: 30px"><v-icon large>error</v-icon> {{ $t('It seems that your browser cannot load Web Assembly!') }}</div>
        </v-card-title>
        <v-card-text>
          <v-layout column align-center style="width: 100%; height: 100%;">
            <p class="grey--text">{{ '별무리가 별지도를 그리려면 WebAssembly 가 필요합니다. 브라우저를 최신 버전으로 올린 뒤 다시 시도해 주세요.' }}</p>
            <p><i18n path="In the meantime, you can try the {0}!"><a href="https://stellarium.org">{{ $t('desktop version') }}</a></i18n></p>
          </v-layout>
        </v-card-text>
      </v-card>
    </v-layout>
  </v-container>
</div>

</template>

<script>
export default {
}
</script>

<style>
</style>
