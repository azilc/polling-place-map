<template>
  <div id="info-panel">
    <div v-if="!precinct"
         class="welcome"
    >
      <h1>Find your voting locations</h1>
      <p>
        To get started, click on the map as close as possible to where you are registered to vote.
      </p>
    </div>

    <div class="results" v-if="precinct">
      <h2>
        You selected {{ precinct.county }} County, Precinct {{ precinct.precinctId }}
      </h2>
      <p>
        <em>
          If that doesn't seem right, select a different location on the map to
          accurately show where you are registered to vote. Otherwise, scroll
          down for results.
        </em>
      </p>

      <hr>

      <p><strong>What kind of voting location are you looking for?</strong></p>
      <div class="btn-group-toggle btn-group-vertical" data-toggle="buttons">
        <label class="btn btn-primary"
        >
          <input type="radio"
                 name="options"
                 id="drop-boxes"
                 autocomplete="off"
                 @click="handleLocationTypeSelect"
          >
          Ballot Drop Boxes
        </label>
        <label class="btn btn-primary active"
        >
          <input type="radio"
                 name="options"
                 id="early-voting-locations"
                 autocomplete="off"
                 @click="handleLocationTypeSelect"
          >
          Early Voting Locations
        </label>
        <label class="btn btn-primary"
        >
          <input type="radio"
                 name="options"
                 id="emergency-voting-locations"
                 autocomplete="off"
                 @click="handleLocationTypeSelect"
          >
          Emergency Voting Locations
        </label>
        <label class="btn btn-primary"
        >
          <input type="radio"
                 name="options"
                 id="polling-places"
                 autocomplete="off"
                 @click="handleLocationTypeSelect"
                 checked
          >
          Election Day Voting Locations
        </label>
      </div>

      <!-- RESULTS -->

      <h3>{{ resultsSummaryText }}</h3>

      <div class="alert alert-primary"
           role="alert"
           v-html="locationTypeInfoHtml"
           v-if="locations.length > 0"
      />

      <ul class="list-group">
        <li v-for="location in locations"
            :key="location.id"
            class="list-group-item"
        >
          <h4>{{ location.fields['Polling Location Name'] }}</h4>
          <div>
            <div>
              <strong>
                {{ location.fields['Name'] }}
              </strong>
            </div>
            {{ location.fields['Street Address'] }},
            {{ location.fields['City'] }}, AZ
            {{ location.fields['ZIP Code'] }}
          </div>
          <div>
            {{ location.fields['Dates'] }}
          </div>
          <div>
            {{ location.fields['Hours'] }}
          </div>
          <div>
            <!-- TODO handle null lat/lng? -->
            <a :href="`https://www.google.com/maps/search/?api=1&query=${location.fields['Latitude']},${location.fields['Longitude']}`" target="_blank">
              Open in Google Maps
            </a>
          </div>
        </li>
      </ul>
    </div>

    <h2>About this tool</h2>
    <p>
      This tool is to help people find out where and when they are able to vote. The data is provided by the ASU Indian Legal Clinic and is kept as up-to-date as possible. If in doubt, call your county elections office. It is not a voter registration tool. If you want to check your voter registration or register to vote, go to the AZ Secretary of State's site <a href="https://my.arizona.vote/WhereToVote.aspx?s=individual">here</a>.
    </p>
    <hr>
    <p class="small">
      This tool collects non-personally-identifying information of the sort that
      web browsers and servers typically make available, such as the browser
      type, language preference, referring site, and the date and time of each
      visitor request. The purpose of collecting non-personally identifying
      information is to better understand how visitors use the tool. From time
      to time, we may release non-personally-identifying information in the
      aggregate, e.g. by publishing a report on trends in the usage of its
      website.
    </p>
  </div>
</template>

<script>
export default {
  computed: {
    precinct() {
      return this.$store.state.selectedPrecinct;
    },
    selectedLocationType() {
      return this.$store.state.selectedLocationType;
    },
    locations() {
      const LOCATIONS_STATE_KEY_MAP = {
        'polling-places': 'Polling Place',
        'early-voting-locations': 'Early Voting Location',
        'drop-boxes': 'Drop Box',
        'emergency-voting-locations': 'Emergency Voting Location',
      };
      const stateKey = LOCATIONS_STATE_KEY_MAP[this.selectedLocationType];

      return this.$store.getters.locationsForType(stateKey);
    },
    resultsSummaryText() {
      const { locations, selectedLocationType } = this;
      const selectedLocationTypePretty = selectedLocationType.replace(/-/g, ' ');
      const count = locations.length;

      if (count === 0) {
        return `Sorry, we couldn't find any ${selectedLocationTypePretty} for your precinct.`;
      }

      return `We found ${count} ${selectedLocationTypePretty}.`;
    },
    locationTypeInfoHtml() {
      const { selectedLocationType } = this;
      let html = '';

      if (selectedLocationType === 'polling-places') {
        html = 'Day-of voting: Election day is Tuesday, November 3. All polling locations will be open from 6:00 AM to 7:00 PM. As long as you are in line before 7:00 PM, you will still be able to vote. You will need to bring a form of ID to vote in person. More information <a href="https://azsos.gov/elections/voting-election">here</a>. At these locations, you can also drop off the ballot you received by mail.';
      } else if (selectedLocationType === 'early-voting-locations') {
        html = 'Early voting: Early voting in Arizona runs from Tuesday, October 6, to Friday, October 30. Dates and hours vary by location. Voter identification is required to vote in person. More information <a href="https://azsos.gov/elections/voting-election">here</a>. At these locations, you can also drop off the ballot you received by mail.';
      } else if (selectedLocationType === 'drop-boxes') {
        html = 'Ballot drop boxes: You can request a ballot by mail until October 23rd at 5:00 PM by going <a href="https://my.arizona.vote/Early/ApplicationLogin.aspx">here</a>. If you have received a ballot by mail, you can use any drop box in the county of your voter registration up until 7:00 PM on Election Day (Tuesday, November 3). In addition to what you see below, all voting locations when open will accept the ballot you received by mail. If you cannot mail your ballot back by October 27th, it is recommended you drop it off at one of these voting locations or drop boxes.';
      } else if (selectedLocationType === 'emergency-voting-locations') {
        html = 'Emergency voting: Emergency voting in Arizona is available to those who cannot vote on Election Day. This special voting period runs from Friday, October 30 at 5:00 PM to Monday, November 2 at 5:00 PM. Dates and hours vary by location. Voter identification is required to vote in person. More information <a href="https://azsos.gov/elections/voting-election">here</a>. At these locations, you can also drop off the ballot you received by mail.';
      }

      return html;
    },
  },
  methods: {
    handleLocationTypeSelect(e) {
      const locationType = e.target.id;
      this.$store.commit('setSelectedLocationType', locationType);
    },
  },
};
</script>

<style scoped>
#info-panel {
  order: 2;
  padding: 1rem;
}

h2 {
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 2rem;
}

.results {
  margin-bottom: 2rem;
}

@media (min-width: 992px) {
  #info-panel {
    order: 1 !important;
  }
}
</style>
