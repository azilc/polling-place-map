import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const LOCATION_TYPES_PRETTY_MAP = {
  'polling-places': 'Polling Place',
  'early-voting-locations': 'Early Voting Location',
  'drop-boxes': 'Drop Box',
  'emergency-voting-locations': 'Emergency Voting Location',
};

export default new Vuex.Store({
  state: {
    selectedPoint: null,
    precinct: null,
    precinctError: null,
    selectedLocationType: 'polling-places',
    locations: {
      status: null,
      data: [],
    },
  },
  mutations: {
    setSelectedPoint(state, point) {
      state.selectedPoint = point;
    },
    setPrecinct(state, precinct) {
      state.precinct = precinct;
    },
    setPrecinctError(state, error) {
      state.precinctError = error;
    },
    setLocationsFetchStatus(state, status) {
      state.locations.status = status;
    },
    setLocationsData(state, data) {
      state.locations.data = data;
    },
    setSelectedLocationType(state, locationType) {
      state.selectedLocationType = locationType;
    },
  },
  actions: {
    async handlePrecinctSelect({ commit }, precinct) {
      // if no precinct was passed in, there was some issue (e.g. they clicked
      // outside az or multiple precincts returned) so clear everything out
      if (!precinct) {
        commit('setLocationsFetchStatus', null);
        commit('setLocationsData', []);
        commit('setPrecinct', null);
        return;
      }

      commit('setLocationsFetchStatus', 'loading');

      const { county, precinctId } = precinct;
      let sourceLocationsRecords = [];
      let offset;

      // airtable only returns 100 records per query, so do this in a loop
      /* eslint-disable no-await-in-loop */
      do {
        const locationsUrl = new URL(`https://api.airtable.com/v0/appT1HFWoS3zL6giD/${process.env.VUE_APP_LOCATIONS_TABLE}`);
        const locationUrlParams = {
          filterByFormula: `AND({Latitude} != BLANK(), {Longitude} != BLANK(), {County} = "${county}", OR({Precinct Number} = "${precinctId}", {Precinct Number} = "All"), {Active} = 1)`,
        };

        // offset is undefined on the first run so only set it on subsequent
        // iterations
        if (offset) {
          locationUrlParams.offset = offset;
        }

        locationsUrl.search = new URLSearchParams(locationUrlParams);

        const locationsRes = await fetch(locationsUrl, {
          headers: {
            Authorization: `Bearer ${process.env.VUE_APP_AIRTABLE_BEARER_TOKEN}`,
          },
        });
        const sourceLocationsData = await locationsRes.json();
        sourceLocationsRecords = sourceLocationsRecords.concat(sourceLocationsData.records);
        offset = sourceLocationsData.offset;
      } while (offset);

      // TODO handle fetch error

      commit('setLocationsFetchStatus', 'success');
      commit('setLocationsData', sourceLocationsRecords);
      commit('setPrecinct', precinct);
    },
  },
  getters: {
    selectedLocationTypeLabel(state, getters) {
      const { selectedLocationType } = state;
      const counts = getters.locationCounts;
      const label = LOCATION_TYPES_PRETTY_MAP[selectedLocationType].toLowerCase();
      let suffix = 's';

      if (selectedLocationType === 'drop-boxes') {
        suffix = 'es';
      }

      return counts[selectedLocationType] === 1 ? label : label + suffix;
    },
    locationsForSelectedType(state) {
      const { selectedLocationType } = state;
      const selectedLocationTypePretty = LOCATION_TYPES_PRETTY_MAP[selectedLocationType];

      return state.locations.data.filter((location) => {
        return location.fields['Location Type'] === selectedLocationTypePretty;
      });
    },
    locationCounts(state) {
      const counts = {};
      for (const type in LOCATION_TYPES_PRETTY_MAP) {
        const typedLocations = state.locations.data.filter((location) => {
          return location.fields['Location Type'] === LOCATION_TYPES_PRETTY_MAP[type];
        });
        counts[type] = typedLocations.length;
      }
      return counts;
    },
  },
});
