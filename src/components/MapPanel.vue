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
  data() {
    return {
      shouldShowGeocoderHelpText: false,
    };
  },
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
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      placeholder: 'Search for a nearby town',
      marker: false,
      mapboxgl,
    }).on('result', this.didSearchWithGeocoder);
    map.addControl(geocoder);

    // add geocoding help text
    // TODO this was a last minute add and could probably be made more elegant/
    // vue-like
    class GeocoderHelpTextControl {
      onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl geocoder-help-text bg-warning';
        this._container.textContent = 'Now click the map to see polling places';

        this._container.style.display = 'none';
        this._container.style.padding = '10px';
        this._container.style['font-size'] = '1rem';

        return this._container;
      }

      onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
      }
    }

    const geocoderHelpTextControl = new GeocoderHelpTextControl();
    map.addControl(geocoderHelpTextControl);

    // check if this is an iframe
    let isIframe;
    try {
      isIframe = (window.self !== window.top);
    } catch (e) {
      isIframe = true;
    }
    this.isIframe = isIframe;

    map.on('load', this.mapDidLoad);
    map.on('click', this.handleMapClick);
  },
  computed: {
    selectedPoint() {
      return this.$store.state.selectedPoint;
    },
    locations() {
      return this.$store.getters.locationsForSelectedType;
    },
  },
  watch: {
    selectedPoint(nextSelectedPoint) {
      // if we're unsetting the current selected point
      if (!nextSelectedPoint) {
        this.selectedPointMarker.remove();
        this.selectedPointMarker = null;
        return;
      }

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
    locations() {
      this.updateLocationMarkers();
    },
    shouldShowGeocoderHelpText(nextShouldShowGeocoderHelpText) {
      const nextDisplay = nextShouldShowGeocoderHelpText ? 'block' : 'none';
      document.querySelector('.geocoder-help-text').style.display = nextDisplay;
    },
  },
  methods: {
    mapDidLoad() {
      const { map } = this;

      map.addSource('precincts', {
        type: 'vector',
        url: 'mapbox://aznativevoteep.2hi2fi60',
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
      // console.log('handle map click', e);

      // HACK ignore marker clicks
      const isMarkerClick = e.originalEvent.target.tagName !== 'CANVAS';
      if (isMarkerClick) return;

      const { lngLat } = e;
      this.$store.commit('setSelectedPoint', lngLat);

      const features = this.map.queryRenderedFeatures(e.point);
      const precinctFeatures = features.filter((feature) => {
        return feature.source === 'precincts';
      });

      // handle no precincts returned
      if (precinctFeatures.length < 1) {
        this.$store.commit('setPrecinct', null);
        this.$store.commit(
          'setPrecinctError',
          'no-precincts',
        );
        this.$store.dispatch('handlePrecinctSelect', null);
        return;
      }

      // handle multiple precincts returned
      if (precinctFeatures.length > 1) {
        this.$store.commit('setPrecinct', null);
        this.$store.commit(
          'setPrecinctError',
          'multiple-precincts',
        );
        this.$store.dispatch('handlePrecinctSelect', null);
        return;
      }

      // if we're still here, reset selected precinct error
      this.$store.commit('setPrecinctError', null);

      // update precinct object in state
      const precinctFeature = precinctFeatures[0];
      const precinctId = precinctFeature.properties.precinct?.toString().replace(/^0/, '') || 'All';
      const county = precinctFeature.properties.county;     
      const precinct = {
        county,
        precinctId,
      };
      this.$store.dispatch('handlePrecinctSelect', precinct);

      // hide geocoder help text if it's showing
      if (this.shouldShowGeocoderHelpText) {
        this.shouldShowGeocoderHelpText = false;
      }
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
      const { locations } = this;

      // if there are no new locations, just stop
      if (locations.length === 0) {
        return;
      }

      const locationMarkers = [];

      locations.forEach((location) => {
        const lng = location.fields.Longitude;
        const lat = location.fields.Latitude;

        // create popup        
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<strong>${location.fields.Name}<strong><br><a href="#${location.fields['Pseudo ID'].trim()}">get directions & hours</a>`);

        const marker = new mapboxgl.Marker({
          color: 'blue',
        })
          .setLngLat({ lng, lat })
          .setPopup(popup)
          .addTo(this.map);

        locationMarkers.push(marker);
      });

      this.locationMarkers = locationMarkers;

      // zoom to bounds
      // adapted from https://stackoverflow.com/a/35715102/676001
      const bounds = new mapboxgl.LngLatBounds();
      locationMarkers.forEach((locationMarker) => {
        bounds.extend(locationMarker.getLngLat());
      });
      bounds.extend(this.selectedPointMarker.getLngLat());

      // HACK it's hard (if not impossible) to get the dimensions of the iframe
      // because of cross-origin frame restrictions. but, conveniently, all of
      // the sites this is currently embedded on set the iframe width to less
      // than 992, so we can assume a more mobile-ish viewport.
      const padding = (this.isIframe || document.body.clientWidth < 992) ? 100 : 200;
      this.map.fitBounds(bounds, { padding });
    },
    didSearchWithGeocoder(e) {
      this.shouldShowGeocoderHelpText = true;

      // reset selected point and precinct data, in case there is one
      // TODO this is a bit hacky
      this.$store.commit('setSelectedPoint', null);
      this.$store.dispatch('handlePrecinctSelect', null);
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
