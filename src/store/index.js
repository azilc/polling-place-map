import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    selectedPoint: null,
    selectedPrecinct: null,
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
      state.selectedPrecinct = precinct;
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
      commit('setLocationsFetchStatus', 'loading');

      const { county, precinctId } = precinct;

      const locationsUrl = new URL('https://api.airtable.com/v0/appT1HFWoS3zL6giD/Locations');
      locationsUrl.search = new URLSearchParams({
        filterByFormula: `AND({Latitude} != BLANK(), {Longitude} != BLANK(), {County} = "${county}", OR({Precinct Number} = "${precinctId}", {Precinct Number} = "All"), {Active} = 1)`,
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
    locationsForType: (state) => (locationType) => {
      return state.locations.data.filter((location) => {
        return location.fields['Location Type'] === locationType;
      });
    },
  },
});
