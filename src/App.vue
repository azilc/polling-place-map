<template>
  <div id="app">
    <InfoPanel class="panel" />
    <MapPanel class="panel" />
  </div>
</template>

<script>
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import InfoPanel from '@/components/InfoPanel.vue';
import MapPanel from '@/components/MapPanel.vue';

export default {
  components: {
    InfoPanel,
    MapPanel,
  },
};
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
}

@media (min-width: 992px) {
  #app {
    flex-direction: row;
    height: 100vh;
  }

  .panel {
    flex-basis: 0;
    flex-grow: 1;
  }
}
</style>
