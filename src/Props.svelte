<!--
  (C) 2022 Roach Sebastien
    handles the props api call
-->

<script>

    import {onMount} from "svelte";

    const apiURL = "http://www.7timer.info/bin/api.pl?lon=113.17&lat=23.09&product=astro&output=json";
    export let props = {};
    onMount(async function() {
        const response = await fetch(apiURL);
        props = await response.json();
    })
</script>