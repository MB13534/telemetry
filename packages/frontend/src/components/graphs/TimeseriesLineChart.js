import React, { forwardRef } from "react";
import { withTheme } from "styled-components/macro";

import { Chart, Bar, Line } from "react-chartjs-2";
import "chartjs-adapter-moment";
import zoomPlugin from "chartjs-plugin-zoom";
import { add } from "date-fns";
import Loader from "../Loader";
import { Typography } from "@material-ui/core";
import { lineColors } from "../../utils";

Chart.register(zoomPlugin);

const TimeseriesLineChart = forwardRef(
  (
    {
      data,
      error,
      isLoading,
      filterValues,
      locationsOptions,
      yLLabel,
      reverseLegend = true,
      xLabelUnit = "day",
      xLabelFormat = "MM-DD-YYYY",
      tooltipFormat = "MM-DD-YYYY, h:mm A",
      yRLLabel = null,
      type = "line",
      theme,
    },
    ref
  ) => {
    const plugins = [
      {
        id: "chartFillBackground",
        beforeDraw: (chart) => {
          const ctx = chart.ctx;
          ctx.fillStyle = lineColors.lightGray;
          ctx.fillRect(0, 0, chart.width, chart.height);
        },
      },
      {
        id: "chartAreaBorder",
        beforeDraw(chart) {
          const {
            ctx,
            chartArea: { left, top, width, height },
          } = chart;
          if (chart.options.plugins.zoom.zoom.wheel.enabled) {
            ctx.save();
            ctx.strokeStyle = "#800000";
            ctx.lineWidth = 3;
            ctx.strokeRect(left, top, width, height);
            ctx.restore();
          }
        },
      },
      {
        id: "annotatedVerticalLine",
        afterDraw(chart) {
          if (chart.config.type === "line" && chart.tooltip?._active?.length) {
            let x = chart.tooltip._active[0].element.x;
            let yAxis = chart.scales.yL;
            let ctx = chart.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, yAxis.top);
            ctx.lineTo(x, yAxis.bottom);
            ctx.lineWidth = 9;
            ctx.strokeStyle = "rgba(0, 0, 255, 0.2)";
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x, yAxis.top);
            ctx.lineTo(x, yAxis.bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(0, 0, 255, 0.4)";
            ctx.stroke();
            ctx.restore();
          }
        },
      },
    ];

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        filler: {
          propagate: false,
        },
        tooltip: {
          callbacks: {
            footer: (tooltipItems) => {
              return (
                tooltipItems[0].dataset.popupInfo &&
                tooltipItems[0].dataset.popupInfo[tooltipItems[0].dataIndex]
              );
            },
          },
          footerAlign: "center",
          //TODO
          // footerColor: ctx =>
        },
        legend: {
          display: true,
          reverse: reverseLegend,
          labels: {
            usePointStyle: true,
            color: lineColors.darkGray,
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
          },
          zoom: {
            mode: "x",
            wheel: {
              enabled: false,
            },
            pinch: {
              enabled: true,
            },
          },
          //TODO line segment styling
        },
      },

      scales: {
        x: {
          type: "time",
          min:
            filterValues.previousDays === ""
              ? null
              : filterValues.checked
              ? add(new Date().getTime(), { days: -filterValues.previousDays })
              : filterValues.startDate,
          max:
            filterValues.previousDays === ""
              ? null
              : filterValues.checked
              ? new Date()
              : filterValues.endDate,
          time: {
            unit: xLabelUnit,
            displayFormats: {
              [xLabelUnit]: xLabelFormat,
            },
            tooltipFormat: tooltipFormat,
          },
          grid: {
            display: false,
          },
          ticks: {
            color: lineColors.darkGray,
            maxTicksLimit: 9,
          },
        },

        yL: {
          position: "left",
          display: true,
          title: {
            display: true,
            text: yLLabel,
            color: lineColors.darkGray,
          },
          ticks: {
            color: lineColors.darkGray,
          },
          grid: {
            color: theme.palette.text.gridLines,
            borderDash: [5, 5],
            drawBorder: true,
            drawTicks: true,
          },
        },
        yR: {
          position: "right",
          display: !!yRLLabel,
          title: {
            display: true,
            text: yRLLabel,
            color: lineColors.darkGray,
          },
          ticks: {
            color: lineColors.darkGray,
          },
          grid: {
            display: false,
            drawTicks: true,
            drawBorder: false,
          },
        },
      },
      onClick(e) {
        const chart = e.chart;
        chart.options.plugins.zoom.zoom.wheel.enabled =
          !chart.options.plugins.zoom.zoom.wheel.enabled;
        chart.update();
      },
    };

    if (error) return "An error has occurred: " + error.message;
    return (
      <>
        {isLoading ? (
          <Loader />
        ) : (
          <>
            {data?.datasets?.length > 0 && locationsOptions?.length ? (
              type === "line" ? (
                <Line
                  plugins={plugins}
                  ref={ref}
                  data={data}
                  options={options}
                  type={type}
                />
              ) : (
                <Bar
                  plugins={plugins}
                  ref={ref}
                  data={data}
                  options={options}
                  type={type}
                />
              )
            ) : (
              <Typography>No Data Available</Typography>
            )}
          </>
        )}
      </>
    );
  }
);
export default withTheme(TimeseriesLineChart);
