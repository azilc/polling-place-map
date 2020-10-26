<template>
  <div id="map-panel">
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiYXpuYXRpdmV2b3RlZXAiLCJhIjoiY2tmb25uNXVuMDF0dDJxbzd1YnA1c3MxcyJ9.TWEc5QMg1YV6LHCn5lP9dw';

export default {
  mounted() {
    // set initial zoom (small screen vs large)
    const zoom = window.screen.width < 992 ? 3 : 6;

    const map = new mapboxgl.Map({
      container: 'map-panel',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-111.8869546, 34.1715142],
      zoom,
      minZoom: 5,
      maxZoom: 15,
    });
    this.map = map;

    // add zoom/pan controls
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // add geocoder
    map.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
      }),
    );

    map.on('load', this.mapDidLoad);
    map.on('click', 'precincts', this.handleMapClick);
  },
  computed: {
    selectedPoint() {
      return this.$store.state.selectedPoint;
    },
    precinctId() {
      return this.$store.state.precinctId;
    },
    selectedLocationType() {
      return this.$store.state.selectedLocationType;
    },
    locationsFetchStatus() {
      return this.$store.state.locations.status;
    },
  },
  watch: {
    selectedPoint(nextSelectedPoint) {
      // create the selected point marker if we don't have one already
      if (!this.selectedPointMarker) {
        this.selectedPointMarker = new mapboxgl.Marker({
          color: 'red',
        })
          .setLngLat(nextSelectedPoint)
          .addTo(this.map);
      } else {
        this.selectedPointMarker.setLngLat(nextSelectedPoint);
      }
    },
    selectedLocationType() {
      this.updateLocationMarkers();
    },
    locationsFetchStatus(nextStatus) {
      // TODO maybe a little hacky/indirect?
      if (nextStatus === 'success') {
        this.updateLocationMarkers();
      }
    },
  },
  methods: {
    mapDidLoad() {
      const { map } = this;

      map.addSource('precincts', {
        type: 'vector',
        url: 'mapbox://aznativevoteep.5bddfpzc',
      });
      map.addLayer({
        id: 'precincts',
        type: 'fill',
        source: 'precincts',
        'source-layer': 'az_precincts',
        paint: {
          'fill-outline-color': 'rgba(0, 0, 255, 0)',
          'fill-color': 'rgba(0, 0, 255, 0)',
        },
      });
    },
    handleMapClick(e) {
      // console.log('handle map click', e, e.features);

      // HACK ignore marker clicks
      const isMarkerClick = e.originalEvent.target.tagName !== 'CANVAS';
      if (isMarkerClick) return;

      const { lngLat } = e;
      this.$store.commit('setSelectedPoint', lngLat);

      const countyPrecinctId = e.features[0].properties.prec_code;
      // TODO edge cases? make sure we only split on space before numeric (regex?)
      const [county, precinctIdLeadingZero] = countyPrecinctId.replace('AZ_', '').split('_');
      const precinctId = precinctIdLeadingZero.replace(/^0/, '');
      const precinct = {
        county,
        precinctId,
      };
      this.$store.dispatch('handlePrecinctSelect', precinct);
    },
    updateLocationMarkers() {
      // remove existing markers
      const prevLocationMarkers = this.locationMarkers;

      if (prevLocationMarkers) {
        prevLocationMarkers.forEach((prevLocationMarker) => {
          prevLocationMarker.remove();
        });
      }

      // display new markers
      const { selectedLocationType } = this;

      // TODO this is a little hacky
      const LOCATION_TYPE_BUTTON_ID_MAP = {
        'polling-places': 'Polling Place',
        'early-voting-locations': 'Early Voting Location',
        'drop-boxes': 'Drop Box',
        'emergency-voting-locations': 'Emergency Voting Location',
      };
      const locationTypePretty = LOCATION_TYPE_BUTTON_ID_MAP[selectedLocationType];

      // const selectedLocationTypeCamel = toCamel(selectedLocationType);
      const nextLocations = this.$store.getters.locationsForType(locationTypePretty);

      // if there are no new locations, just stop
      if (nextLocations.length === 0) {
        return;
      }

      const nextLocationMarkers = [];

      nextLocations.forEach((nextLocation) => {
        const lng = nextLocation.fields.Longitude;
        const lat = nextLocation.fields.Latitude;

        // create popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setText(nextLocation.fields.Name);

        const marker = new mapboxgl.Marker({
          color: 'blue',
        })
          .setLngLat({ lng, lat })
          .setPopup(popup)
          .addTo(this.map);

        nextLocationMarkers.push(marker);
      });

      this.locationMarkers = nextLocationMarkers;

      // zoom to bounds
      // adapted from https://stackoverflow.com/a/35715102/676001
      const bounds = new mapboxgl.LngLatBounds();
      nextLocationMarkers.forEach((nextLocationMarker) => {
        bounds.extend(nextLocationMarker.getLngLat());
      });
      bounds.extend(this.selectedPointMarker.getLngLat());

      // set padding based on small screen vs large
      const padding = window.screen.width < 992 ? 50 : 200;
      this.map.fitBounds(bounds, {
        padding,
      });
    },
  },
};
</script>

<style scoped>
#map-panel {
  height: 400px;
  order: 1;
}

@media (min-width: 992px) {
  #map-panel {
    height: 100%;
    order: 2 !important;
  }
}
</style>
