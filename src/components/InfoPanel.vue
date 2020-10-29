<template>
  <div id="info-panel">
    <div v-if="!selectedPoint && !precinct"
         class="welcome"
    >
      <h1>Find your voting locations</h1>
      <p>
        To get started, click on the map as close as possible to where you are registered to vote.
      </p>
    </div>

    <!-- error: user clicked map but no precinct found -->
    <div v-if="precinctError === 'no-precincts' && !precinct">
      <h2>
        You've selected a location outside Arizona.
      </h2>

      <div class="alert alert-primary" role="alert">
        Are you a voter from another state? Find your polling places <a href="https://www.google.com/search?q=where+do+i+vote">here</a>.
      </div>
    </div>

    <!-- error: user clicked map and multiple precincts were found
    (rare edge case/data quality issue) -->
    <div v-if="selectedPoint === 'multiple-precincts' && !precinct">
      <h2>
        Oops! We ran into an issue getting precincts for that location. Please 
        try again.
      </h2>
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
        <li v-for="location in locationsSortedByDistance"
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
            <a :href="`https://www.google.com/maps/dir/?api=1&destination=${location.fields['Latitude']},${location.fields['Longitude']}`" target="_blank">
              Open in Google Maps
            </a>
          </div>
        </li>
      </ul>
    </div>

    <hr>

    <h3>About this tool</h3>
    <p class="small">
      This is not a voter registration tool. It is to help people find out where and when they are able to vote. The data is provided by the ASU Law Indian Legal Clinic and is kept as up-to-date as possible. If in doubt, call your county elections office. If you want to check your voter registration or register to vote, go to the AZ Secretary of State's site <a href="https://my.arizona.vote/WhereToVote.aspx?s=individual">here</a>.
    </p>
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
import { getDistance } from 'geolib';

export default {
  computed: {
    selectedPoint() {
      return this.$store.state.selectedPoint;
    },
    precinct() {
      return this.$store.state.precinct;
    },
    precinctError() {
      return this.$store.state.precinctError;
    },
    selectedLocationType() {
      return this.$store.state.selectedLocationType;
    },
    locations() {
      return this.$store.getters.locationsForSelectedType;
    },
    locationsSortedByDistance() {
      const { locations, selectedPoint } = this;
      const locationsSorted = [...locations];

      locationsSorted.sort((a, b) => {
        const distA = getDistance(selectedPoint, {
          lat: a.fields.Latitude,
          lng: a.fields.Longitude,
        });
        const distB = getDistance(selectedPoint, {
          lat: b.fields.Latitude,
          lng: b.fields.Longitude,
        });

        let order;

        if (distB < distA) {
          order = 1;
        } else if (distA < distB) {
          order = -1;
        } else {
          order = 0;
        }

        return order;
      });

      return locationsSorted;
    },
    resultsSummaryText() {
      const { locations, selectedLocationType } = this;
      let selectedLocationTypePretty = selectedLocationType.replace(/-/g, ' ');
      const count = locations.length;

      if (count === 0) {
        return `Sorry, we couldn't find any ${selectedLocationTypePretty} for your precinct.`;
      }

      if (count === 1) {
        selectedLocationTypePretty = selectedLocationTypePretty.replace(/s$/, '');
      }

      return `We found ${count} ${selectedLocationTypePretty}.`;
    },
    locationTypeInfoHtml() {
      const { selectedLocationType } = this;
      let html = '';

      if (selectedLocationType === 'polling-places') {
        html = `
          All Election Day Voting Locations will be open from 6AM to 7PM on Tuesday, November 3. 
          As long as you are in line before 7PM, you will still be able to vote. 
          Voter identification is required to vote in person. 
          More information <a href="https://azsos.gov/elections/voting-election">here</a>.
          <hr />
          At these locations, you can also drop off the ballot you received by mail.
        `;
      } else if (selectedLocationType === 'early-voting-locations') {
        html = `
          Early voting runs until 5PM Friday, October 30. Dates and hours vary by location. 
          Voter identification is required to vote in person. 
          More information <a href="https://azsos.gov/elections/voting-election">here</a>.
          <hr />
          At these locations, you can also drop off the ballot you received by mail.
          Look at Emergency Voting Locations for voting options from 5PM Friday, October 30, to 5PM Monday, November 2.
        `;
      } else if (selectedLocationType === 'drop-boxes') {
        html = `
          If you have received a ballot by mail, you can use any drop box in the county of your voter registration until 7PM Tuesday, November 3 (Election Day). If you cannot mail your ballot back by October 27, it is recommended that you drop it off.
          <hr />
          In addition to the options below, ALL voting locations when open will accept the ballot you received by mail. Early Voting Locations have options until 5PM Friday, October 30. Emergency Voting Locations have options from 5PM Friday, October 30 to 5PM Monday, November 2. Election Day Voting Locations are all open from 6AM - 7PM on Tuesday, November 3.
        `;
      } else if (selectedLocationType === 'emergency-voting-locations') {
        html = `
          Emergency Voting is available from 5PM Friday, October 30 to 5PM Monday, November 2.
          It is for those who are unable to vote early or on Election Day.
          Dates and hours vary by location. Voter identification is required to vote in person.
          More information <a href="https://azsos.gov/elections/voting-election">here</a>.
          <hr />
          At these locations, you can also drop off the ballot you received by mail.
        `;
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
