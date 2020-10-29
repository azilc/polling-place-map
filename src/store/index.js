import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    selectedPoint: null,
    precinct: null,
    precinctError: null,
    selectedLocationType: 'early-voting-locations',
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

      const locationsUrl = new URL('https://api.airtable.com/v0/appT1HFWoS3zL6giD/Locations');
      locationsUrl.search = new URLSearchParams({
        filterByFormula: `AND({Latitude} != BLANK(), {Longitude} != BLANK(), {County} = "${county}", OR({Precinct Number} = "${precinctId}", {Precinct Number} = "All"), {Active} = 1)`,
        // TODO/HACK this is a workaround of sorts for airtable only returning
        // 100 records at a time. we want to prioritize rows that are on tribal
        // land.
        'sort[0][field]': 'Tribal Land',
        'sort[0][direction]': 'desc',
      });
      const locationsRes = await fetch(locationsUrl, {
        headers: {
          // note: this key is for a dummy, read-only airtable user
          // sorry, hackers :P
          Authorization: 'Bearer keyuJB9Hqg3p2tuCI',
        },
      });
      const sourceLocationsData = await locationsRes.json();
      const sourceLocationsRecords = sourceLocationsData.records;

      // TODO handle fetch error

      commit('setLocationsFetchStatus', 'success');
      commit('setLocationsData', sourceLocationsRecords);
      commit('setPrecinct', precinct);
    },
  },
  getters: {
    locationsForSelectedType(state) {
      const { selectedLocationType } = state;

      const LOCATION_TYPES_PRETTY_MAP = {
        'polling-places': 'Polling Place',
        'early-voting-locations': 'Early Voting Location',
        'drop-boxes': 'Drop Box',
        'emergency-voting-locations': 'Emergency Voting Location',
      };

      const selectedLocationTypePretty = LOCATION_TYPES_PRETTY_MAP[selectedLocationType];

      return state.locations.data.filter((location) => {
        return location.fields['Location Type'] === selectedLocationTypePretty;
      });
    },
  },
});
