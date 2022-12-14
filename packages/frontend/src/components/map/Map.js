import React, { useEffect, useRef, useState } from "react";
import useService from "../../hooks/useService";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import styled from "styled-components/macro";
import { useQuery } from "react-query";
import { findRawRecords } from "../../services/crudService";
import ResetZoomControl from "./ResetZoomControl";
import { STARTING_LOCATION } from "../../constants";
import { useApp } from "../../AppProvider";
// import { filterDataByUser } from "../../../utils";
import ToggleBasemapControl from "./ToggleBasemapControl";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const MapContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const Coordinates = styled.pre`
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  position: absolute;
  bottom: 40px;
  left: 10px;
  padding: 5px 10px;
  margin: 0;
  font-size: 11px;
  line-height: 18px;
  border-radius: 3px;
  z-index: 100000;
  display: none;
`;

const Map = () => {
  const [mapIsLoaded, setMapIsLoaded] = useState(false);
  const [map, setMap] = useState();
  const mapContainer = useRef(null); // create a reference to the map container
  const coordinates = useRef(null);
  const DUMMY_BASEMAP_LAYERS = [
    { url: "streets-v11", icon: "commute" },
    { url: "outdoors-v11", icon: "park" },
    { url: "satellite-streets-v11", icon: "satellite_alt" },
  ];

  function onPointClick(e) {
    coordinates.current.style.display = "block";
    coordinates.current.innerHTML = `Longitude: ${e.features[0].geometry.coordinates[0]}<br />Latitude: ${e.features[0].geometry.coordinates[1]}`;
  }
  const service = useService({ toast: false });

  const { currentUser } = useApp();

  const { data, isLoading, error } = useQuery(
    ["dropdown-locations", currentUser],
    async () => {
      try {
        const response = await service([findRawRecords, ["DropdownLocations"]]);
        // const data = filterDataByUser(response, currentUser);
        return response.filter((location) => location.location_geometry);
      } catch (err) {
        console.error(err);
      }
    },
    { keepPreviousData: true }
  );

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/" + DUMMY_BASEMAP_LAYERS[0].url,
      center: STARTING_LOCATION,
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-left");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        // When active the map will receive updates to the device's location as it changes.
        trackUserLocation: true,
        // Draw an arrow next to the location dot to indicate which direction the device is heading.
        showUserHeading: true,
      }),
      "top-left"
    );
    map.addControl(new mapboxgl.FullscreenControl());
    // Add locate control to the map.
    map.addControl(new ResetZoomControl(), "top-left");

    DUMMY_BASEMAP_LAYERS.forEach((layer) => {
      return map.addControl(new ToggleBasemapControl(layer.url, layer.icon));
    });

    map.on("render", () => {
      map.resize();
    });
    map.on("load", () => {
      setMapIsLoaded(true);
      map.resize();
      setMap(map);
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (mapIsLoaded && data?.length > 0 && typeof map != "undefined") {
      if (!map.getSource("locations")) {
        map.addSource("locations", {
          // This GeoJSON contains features that include an "icon"
          // property. The value of the "icon" property corresponds
          // to an image in the Mapbox Streets style's sprite.
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: data.map((location) => {
              return {
                type: "Feature",
                properties: {
                  description: location.location_name,
                },
                geometry: {
                  type: location.location_geometry.type,
                  coordinates: location.location_geometry.coordinates,
                },
              };
            }),
          },
        });
        // Add a layer showing the places.
        map.addLayer({
          id: "locations",
          type: "circle",
          source: "locations",
          paint: {
            "circle-radius": 6,
            "circle-color": "#B42222",
          },
        });

        // When a click event occurs on a feature in the places layer, open a popup at the
        // location of the feature, with description HTML from its properties.
        map.on("click", "locations", (e) => {
          // Copy coordinates array.
          const coordinates = e.features[0].geometry.coordinates.slice();
          const description = e.features[0].properties.description;

          // Ensure that if the map is zoomed out such that multiple
          // copies of the feature are visible, the popup appears
          // over the copy being pointed to.
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(description)
            .addTo(map);
        });

        map.on("click", "locations", onPointClick);

        // Change the cursor to a pointer when the mouse is over the places layer.
        map.on("mouseenter", "locations", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        // Change it back to a pointer when it leaves.
        map.on("mouseleave", "locations", () => {
          map.getCanvas().style.cursor = "";
        });
      }
    }
  }, [isLoading, mapIsLoaded, map, data]);

  if (error) return "An error has occurred: " + error.message;

  return (
    <MapContainer ref={mapContainer}>
      <Coordinates ref={coordinates} />
    </MapContainer>
  );
};

export default Map;
