<template>
  <div id="info-panel">
    <div v-if="!selectedPoint && !precinct"
         class="welcome"
    >
      <h1>Find your voting location for the US General Election</h1>
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
        You selected {{ precinct.county }} County<span v-if="precinct.precinctId !== 'All'">, Precinct {{ precinct.precinctId }}</span>
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
        <label class="btn btn-primary active"
        >
          <input type="radio"
                 name="options"
                 id="polling-places"
                 autocomplete="off"
                 @click="handleLocationTypeSelect"
                 checked
          >
          Election Day Voting Locations <span class="badge badge-light">{{locationCount("polling-places")}}</span>
        </label>
        <label class="btn btn-primary"
        >
          <input type="radio"
                 name="options"
                 id="early-voting-locations"
                 autocomplete="off"
                 @click="handleLocationTypeSelect"
          >
          Early Voting Locations <span class="badge badge-light">{{locationCount("early-voting-locations")}}</span>
        </label>
        <label class="btn btn-primary"
        >
          <input type="radio"
                 name="options"
                 id="drop-boxes"
                 autocomplete="off"
                 @click="handleLocationTypeSelect"
          >
          Ballot Drop Boxes <span class="badge badge-light">{{locationCount("drop-boxes")}}</span>
        </label>
        <label class="btn btn-primary"
        >
          <input type="radio"
                 name="options"
                 id="emergency-voting-locations"
                 autocomplete="off"
                 @click="handleLocationTypeSelect"
          >
          Emergency Voting Locations <span class="badge badge-light">{{locationCount("emergency-voting-locations")}}</span>
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
          <h4 :id="location.fields['Pseudo ID'].trim()">{{ location.fields['Name'] }}</h4>
          <div>
            {{ location.fields['Street Address'] }}            
          </div>
          <div>
            {{ location.fields['City'] }}, AZ
            {{ location.fields['ZIP Code'] }}
          </div>
          <h6 class="mt-3 mb-0">Hours:</h6>
          <div>
            {{ location.fields['Dates'] }}
          </div>
          <div>
            {{ location.fields['Hours'] }}
          </div>          
          <div class="mt-3">
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
      This is not a voter registration tool. It is also not a way to find out where to vote in Tribal Elections. This tool is to help people find out where and when they are able to vote for the US General Election. The data is provided by the ASU Law Indian Legal Clinic and is kept as up-to-date as possible. If in doubt, call your county elections office. If you want to check your voter registration, go to the <a href="https://my.arizona.vote/WhereToVote.aspx?s=individual">AZ Secretary of State's site</a>.
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
    selectedLocationTypeLabel() {
      return this.$store.getters.selectedLocationTypeLabel;
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
      const count = this.locations.length;
      
      if (count === 0) {
        return `Sorry, we couldn't find any ${this.selectedLocationTypeLabel} for your precinct.`;
      }

      return `We found ${count} ${this.selectedLocationTypeLabel}.`;
    },
    locationTypeInfoHtml() {
      const { selectedLocationType } = this;
      let html = '';

      if (selectedLocationType === 'polling-places') {
        html = `Vote in-person on Election Day: Tuesday, ${process.env.VUE_APP_ELECTION_DAY} from 6:00 AM to 7:00 PM. As long as you are in line before 7:00 PM, you will still be able to vote. Voter identification is required. Find out more about <a href="https://azsos.gov/elections/voting-election">what you need to bring to vote in person</a>. <hr />At these locations, you can also drop off the ballot you received by mail.`;
      } else if (selectedLocationType === 'early-voting-locations') {
        html = `Early voting ends has ended. If you cannot vote on ${process.env.VUE_APP_ELECTION_DAY}, you can vote on ${process.env.VUE_APP_DAY_BEFORE_ELECTION_DAY} at an Emergency Voting Location.`;
      } else if (selectedLocationType === 'drop-boxes') {
        html = `Mail ballots can be returned at any drop box in your county until 7:00 PM on Election Day (Tuesday, ${process.env.VUE_APP_ELECTION_DAY}). You can also return them to any in-person voting locations during hours they are open.`;
      } else if (selectedLocationType === 'emergency-voting-locations') {
        html = `
          On Monday, ${process.env.VUE_APP_DAY_BEFORE_ELECTION_DAY}, you can vote at
          one of these emergency voting locations if something unexpected
          happens and you're no longer going to be able to vote on Election Day.
          Voter identification is required. Find out more about 
          <a href="https://azsos.gov/elections/voting-election">what you need to
          bring to vote in person</a>.
          <hr />
          At these locations, you can also drop off the ballot you received by
          mail.
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
    locationCount(type) {
      return this.$store.getters.locationCounts[type];
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
