import React from 'react';
import { Pie } from 'react-chartjs-2';
// Make sure to install chart.js and react-chartjs-2

interface ChartData {
  labels: string[];
  values: number[];
}

interface VisualizationChartsProps {
  data: ChartData;
}

const VisualizationCharts: React.FC<VisualizationChartsProps> = ({ data }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: ['red', 'orange', 'yellow', 'green'],
      },
    ],
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <Pie data={chartData} />
    </div>
  );
};

export default VisualizationCharts;
