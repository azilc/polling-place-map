# az-polling-place-map

A polling place locator for Arizona's Indian Country, supporting voters without standard addresses

This project is a collaboration between the Arizona State University [Indian Legal Clinic](https://law.asu.edu/experiences/clinics/indian-legal) and [U.S. Digital Response](https://www.usdigitalresponse.org/).

![Screenshot](/screenshot.png?raw=true "Screenshot")

## Project setup
```
yarn install
```

Then create an .env.local file in the root directory with the following line, replacing "YOUR_TOKEN" with a [personal access token](https://airtable.com/developers/web/guides/personal-access-tokens) that has the `data.records:read` scope.
```
VUE_APP_AIRTABLE_BEARER_TOKEN=YOUR_TOKEN
```

### Compiles and hot-reloads for development
```
yarn serve
```

### Compiles and minifies for production
```
yarn build
```

### Lints and fixes files
```
yarn lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
