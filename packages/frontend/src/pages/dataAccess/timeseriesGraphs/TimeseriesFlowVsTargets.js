import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "react-query";
import { add } from "date-fns";

import {
  Accordion,
  AccordionDetails,
  Grid as MuiGrid,
  Typography as MuiTypography,
} from "@material-ui/core";
import { ExpandMore as ExpandMoreIcon } from "@material-ui/icons";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import styled from "styled-components/macro";
import { spacing } from "@material-ui/system";

import useService from "../../../hooks/useService";
import { useApp } from "../../../AppProvider";
import { findRawRecords } from "../../../services/crudService";
import { dateFormatter, lineColors } from "../../../utils";

import Panel from "../../../components/panels/Panel";
import Map from "../../../components/map/Map";
import TimeseriesFilters from "../../../components/filters/TimeseriesFilters";
import SaveGraphButton from "../../../components/graphs/SaveGraphButton";
import OptionsPicker from "../../../components/pickers/OptionsPicker";
import Table from "../../../components/Table";
import TimeseriesLineChart from "../../../components/graphs/TimeseriesLineChart";

const TableWrapper = styled.div`
  overflow-y: auto;
  max-width: calc(100vw - ${(props) => props.theme.spacing(12)}px);
  height: calc(100% - 84px);
  width: 100%;
`;
const FiltersContainer = styled.div`
  height: 100%;
  width: 100%;
`;
const MapContainer = styled.div`
  height: 300px;
  width: 100%;
`;
const TimeseriesContainer = styled.div`
  height: 600px;
  overflow-y: auto;
  width: 100%;
`;
const Grid = styled(MuiGrid)(spacing);
const Typography = styled(MuiTypography)(spacing);

const TimeseriesFlowVsTargets = () => {
  const saveRef = useRef(null);

  //date filter defaults
  const defaultFilterValues = {
    previousDays: 7,
    startDate: add(new Date().getTime(), { days: -7 }),
    endDate: new Date(),
    checked: true,
  };
  const [filterValues, setFilterValues] = useState(defaultFilterValues);
  const changeFilterValues = (name, value) => {
    setFilterValues((prevState) => {
      let newFilterValues = { ...prevState };
      newFilterValues[name] = value;
      return newFilterValues;
    });
  };

  //columns and fields to render on table
  const tableColumns = [
    { title: "Location", field: "location_name", width: "100%" },
    {
      title: "Last Report",
      field: "collect_timestamp",
      render: (rowData) => {
        return dateFormatter(rowData.collect_timestamp, "MM/DD/YYYY, h:mm A");
      },
    },
    { title: "Flow CFS", field: "flow_cfs" },
    { title: "FT Rate CFS", field: "ft_rate_cfs" },
    { title: "FT Remark", field: "ft_remark" },
    { title: "Measurement NDX", field: "measurement_ndx" },
    { title: "Location NDX", field: "location_ndx" },
  ];

  const service = useService({ toast: false });
  const { currentUser } = useApp();

  //fetch all graph/table data
  const { data, isLoading, error } = useQuery(
    ["TimeseriesFlowVsTargets", currentUser],
    async () => {
      try {
        //filters out users that should be excluded
        // return filterDataByUser(response, currentUser);
        return await service([findRawRecords, ["TimeseriesFlowVsTargets"]]);
      } catch (err) {
        console.error(err);
      }
    },
    { keepPreviousData: true }
  );

  //locations to show up in picker
  const [locationsOptions, setLocationsOptions] = useState([]);
  //locations in picker that are selected by user
  const [selectedLocation, setSelectedLocation] = useState("");
  useEffect(() => {
    if (data?.length > 0) {
      //creates a unique set of locations to be used in picker
      const distinctLocationsNames = [
        ...new Set(data.map((item) => item.location_name)),
      ];

      setLocationsOptions(distinctLocationsNames);
      //selects every location by default
      setSelectedLocation(distinctLocationsNames[0] ?? "");
    }
  }, [data]);

  //filtered data for graph, it filters selected locations
  //it keeps every date so the graph can still be panned and zoomed
  //it also mutates the data to be consumed by chartsJS
  const [filteredMutatedGraphData, setFilteredMutatedGraphData] = useState([]);
  //filtered data for table. if filters selected locations
  //it also filters by date
  const [filteredTableData, setFilteredTableData] = useState([]);
  useEffect(() => {
    if (selectedLocation?.length > 0) {
      const filteredData = data.filter((item) =>
        selectedLocation.includes(item.location_name)
      );

      const tableFilterData =
        //if there is no value in the input, yield every record
        filterValues.previousDays === ""
          ? filteredData
          : //if the toggle is checked, yield x days
          filterValues.checked
          ? filteredData.filter(
              (item) =>
                new Date(item.collect_timestamp) >=
                  add(new Date().getTime(), {
                    days: -filterValues.previousDays,
                  }) && new Date(item.collect_timestamp) <= new Date()
            )
          : //if the toggle is unchecked, yield date range
            filteredData.filter(
              (item) =>
                new Date(item.collect_timestamp) >= filterValues.startDate &&
                new Date(item.collect_timestamp) <= filterValues.endDate
            );
      setFilteredTableData(tableFilterData);

      //mutate data for chartJS to use
      const defaultStyle = {
        fill: false,
        pointStyle: "line",
        pointRadius: 0,
        pointHoverRadius: 0,
        // tension: 0.5,
      };
      const graphData = {
        labels: filteredData.map((item) => item.collect_timestamp),
        datasets: [
          {
            label: "Flow",
            borderColor: lineColors.blue,
            backgroundColor: lineColors.blue,
            data: filteredData.map((item) => item.flow_cfs),
            popupInfo: filteredData.map((item) => item.ft_remark),
            borderWidth: 2,
            ...defaultStyle,
          },
          {
            label: "Stipulated Target Flow",
            borderColor: lineColors.orange,
            backgroundColor: lineColors.orange,
            data: filteredData.map((item) => item.ft_rate_cfs),
            borderWidth: 4,
            ...defaultStyle,
          },
        ],
      };
      setFilteredMutatedGraphData(graphData);
    }
  }, [selectedLocation, filterValues, data]);

  return (
    <>
      <Grid container spacing={6}>
        <Grid item xs={12} md={12} lg={7}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="map"
              id="map"
            >
              <Typography variant="h4" ml={2}>
                Map
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <MapContainer>
                <Map />
              </MapContainer>
            </AccordionDetails>
          </Accordion>
        </Grid>
        <Grid item xs={12} md={12} lg={5}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="date-filters"
              id="date-filters"
            >
              <Typography variant="h4" ml={2}>
                Date Filters
              </Typography>
            </AccordionSummary>
            <Panel>
              <AccordionDetails>
                <FiltersContainer>
                  <TimeseriesFilters
                    filterValues={filterValues}
                    changeFilterValues={changeFilterValues}
                  />
                </FiltersContainer>
              </AccordionDetails>
            </Panel>
          </Accordion>
        </Grid>
      </Grid>

      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="time-series"
              id="time-series"
            >
              <Typography variant="h4" ml={2}>
                Graph
              </Typography>
            </AccordionSummary>
            <Panel>
              <AccordionDetails>
                <TimeseriesContainer>
                  <Grid container pb={6} mt={2}>
                    <Grid
                      item
                      style={{ flexGrow: 1, maxWidth: "calc(100% - 54px)" }}
                    >
                      <OptionsPicker
                        selectedOption={selectedLocation}
                        setSelectedOption={setSelectedLocation}
                        options={locationsOptions}
                        label="Locations"
                      />
                    </Grid>
                    <Grid item style={{ width: "53px" }}>
                      <SaveGraphButton
                        ref={saveRef}
                        title="Flow vs Targets Timeseries Graph"
                      />
                    </Grid>
                  </Grid>

                  <TableWrapper>
                    <TimeseriesLineChart
                      data={filteredMutatedGraphData}
                      error={error}
                      isLoading={isLoading}
                      filterValues={filterValues}
                      locationsOptions={locationsOptions}
                      yLLabel="Flow CFS"
                      reverseLegend={false}
                      ref={saveRef}
                    />
                  </TableWrapper>
                </TimeseriesContainer>
              </AccordionDetails>
            </Panel>
          </Accordion>
        </Grid>
      </Grid>

      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="table-content"
              id="table-header"
            >
              <Typography variant="h4" ml={2}>
                Table
              </Typography>
            </AccordionSummary>
            <Panel>
              <AccordionDetails>
                <TableWrapper>
                  <Table
                    isLoading={isLoading}
                    label="This will be the label"
                    columns={tableColumns}
                    data={filteredTableData}
                    height="600px"
                  />
                </TableWrapper>
              </AccordionDetails>
            </Panel>
          </Accordion>
        </Grid>
      </Grid>
    </>
  );
};

export default TimeseriesFlowVsTargets;
