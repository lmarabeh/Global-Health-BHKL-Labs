
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let currentTransform = d3.zoomIdentity;
let currentRegion = 'all';
let currentYear = 2021;
let globalData = null;
let xScale, yScale, rScale, colorScale;
let svg, dots;

async function loadData() {
    const numericFields = [
        "Fertility_Rate", "Urban_Population_Percent", "Total_Population",
        "Water_Access_Percent", "Unemployment_Rate", "Sanitary_Expense_Per_GDP",
        "Life_Expectancy", "Life_Expectancy_Female", "Life_Expectancy_Male",
        "Infant_Deaths", "GDP_Per_Capita", "Hospital_Beds_Per_1000",
        "Female_Population", "Male_Population", "Alcohol_Consumption_Per_Capita",
        "Immunization_Rate", "Sanitary_Expense_Per_Capita", "CO2_Exposure_Percent",
        "Air_Pollution", "Labour_Force_Total", "Tuberculosis_Per_100000",
        "Suicide_Rate_Percent", "Obesity_Rate_Percent", "Underweight_Rate_Percent",
        "Overweight_Rate_Percent", "Safe_Water_Access_Percent", "log_GDP_Per_Capita",
        "Life_Expectancy_Score", "log_GDP_Per_Capita_Score",
        "Safe_Water_Access_Percent_Score", "Unemployment_Rate_Score",
        "Immunization_Rate_Score", "Aggregate_Score"
    ];
    const parseYear = d3.timeParse("%Y");

    const data = await d3.csv("data/global_health_with_index.csv", (row) => {
        numericFields.forEach(f => {
            row[f] = +row[f];
        });
        return {
            ...row,
            Year: parseYear(row.Year),
            Country: row.Country?.trim?.() || "",
        };
    });

    return data;
}

function renderScatterPlot(data, regionFilter = 'all', year = 2021) {
    d3.select('#chart').selectAll('*').remove();

    const width = 1000;
    const height = 600;

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    let filteredYearData = data
        .filter(d => d.Year.getFullYear() === year)
        .filter(d => d.log_GDP_Per_Capita > 0 && d.Life_Expectancy > 0);

    if (regionFilter !== 'all') {
        filteredYearData = filteredYearData.filter(d => d.Region === regionFilter);
    }

    if (filteredYearData.length === 0) {
        console.warn('No data for year', year, 'and region', regionFilter);
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .style('fill', 'white')
            .style('font-size', '20px')
            .text(`No data available for ${regionFilter} in ${year}`);
        return;
    }

    xScale = d3.scaleLinear()
        .domain(d3.extent(filteredYearData, d => d.log_GDP_Per_Capita))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain(d3.extent(filteredYearData, d => d.Life_Expectancy))
        .range([usableArea.bottom, usableArea.top])
        .nice();

    const [minLines, maxLines] = d3.extent(filteredYearData, d => d.Total_Population);
    rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('opacity', 0.15);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const sortedData = d3.sort(filteredYearData, d => -d.Total_Population);

    colorScale = d3.scaleOrdinal(d3.schemePastel1);

    dots = svg.append('g').attr('class', 'dots');

    dots.selectAll("circle")
        .data(sortedData)
        .join("circle")
        .attr("cx", d => xScale(d.log_GDP_Per_Capita))
        .attr("cy", d => yScale(d.Life_Expectancy))
        .attr("r", d => rScale(d.Total_Population))
        .attr("fill", d => colorScale(d.Country))
        .attr("fill-opacity", 0.7)
        .attr("stroke", regionFilter === 'all' ? 'none' : 'gold')
        .attr("stroke-width", regionFilter === 'all' ? 0 : 2)
        .on("mouseenter", (event, d) => {
            d3.select(event.currentTarget)
                .attr("fill-opacity", 1)
                .attr("transform", "scale(1.2)")
                .attr("stroke", "gold")
                .attr("stroke-width", 3);
            renderTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on("mousemove", updateTooltipPosition)
        .on("mouseleave", (event) => {
            d3.select(event.currentTarget)
                .attr("fill-opacity", 0.7)
                .attr("transform", "scale(1)")
                .attr("stroke", regionFilter === 'all' ? 'none' : 'gold')
                .attr("stroke-width", regionFilter === 'all' ? 0 : 2);
            updateTooltipVisibility(false);
        });

    setupZoom();

    updateRegionStats(filteredYearData, regionFilter);

    console.log(`Rendered ${filteredYearData.length} countries for ${year}, region: ${regionFilter}`);
}

function renderTooltipContent(d) {
    const country = document.getElementById('tooltip-country');
    const gdp = document.getElementById('tooltip-gdp');
    const lifeExpectancy = document.getElementById('tooltip-life-expectancy');
    const population = document.getElementById('tooltip-population');
    const aggregate = document.getElementById('tooltip-aggregate');

    if (Object.keys(d).length === 0) return;

    country.textContent = d.Country;
    gdp.textContent = `${d.log_GDP_Per_Capita.toFixed(2)}`;
    lifeExpectancy.textContent = `${d.Life_Expectancy.toFixed(1)} years`;
    population.textContent = d.Total_Population.toLocaleString();
    aggregate.textContent = d.Aggregate_Score ? d.Aggregate_Score.toFixed(2) : 'N/A';
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('chart-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('chart-tooltip');
    const offset = 10;
    tooltip.style.left = `${event.pageX + offset}px`;
    tooltip.style.top = `${event.pageY - offset}px`;
}

function setupZoom() {
    const zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .on('zoom', handleZoom);

    svg.call(zoom);
    svg.on('dblclick.zoom', resetZoom);
}

function handleZoom(event) {
    currentTransform = event.transform;

    dots.attr('transform', currentTransform);

    const newXScale = currentTransform.rescaleX(xScale);
    const newYScale = currentTransform.rescaleY(yScale);

    svg.select('.x-axis').call(d3.axisBottom(newXScale));
    svg.select('.y-axis').call(d3.axisLeft(newYScale));


    svg.select('.gridlines').call(
        d3.axisLeft(newYScale).tickFormat('').tickSize(-1000)
    );
}

function resetZoom() {
    svg.transition()
        .duration(750)
        .call(d3.zoom().transform, d3.zoomIdentity);
}

function setupZoomControls() {
    d3.select('#zoom-in').on('click', () => {
        svg.transition().duration(500).call(d3.zoom().scaleBy, 1.3);
    });

    d3.select('#zoom-out').on('click', () => {
        svg.transition().duration(500).call(d3.zoom().scaleBy, 0.77);
    });
}



function setupRegionControls() {
    d3.select('#region-selector').on('change', function () {
        currentRegion = this.value;
        renderScatterPlot(globalData, currentRegion, currentYear);
    });

    d3.select('#clear-filter').on('click', () => {
        currentRegion = 'all';
        d3.select('#region-selector').property('value', 'all');
        renderScatterPlot(globalData, currentRegion, currentYear);
    });
}



function updateRegionStats(data, region) {
    if (data.length === 0) {
        d3.select('#region-stats').html('<p>No data available</p>');
        return;
    }

    const avgLife = d3.mean(data, d => d.Life_Expectancy);
    const avgGDP = d3.mean(data, d => d.log_GDP_Per_Capita);
    const totalPop = d3.sum(data, d => d.Total_Population);
    const avgAggregate = d3.mean(data.filter(d => d.Aggregate_Score), d => d.Aggregate_Score);

    const regionName = region === 'all' ? 'Global' : region;

    d3.select('#region-stats').html(`
        <h3>${regionName} Statistics (${currentYear})</h3>
        <dl class="stats">
            <dt>Countries</dt>
            <dd>${data.length}</dd>
            
            <dt>Total Population</dt>
            <dd>${(totalPop / 1e9).toFixed(2)} billion</dd>
            
            <dt>Avg Life Expectancy</dt>
            <dd>${avgLife.toFixed(1)} years</dd>
            
            <dt>Avg GDP (log)</dt>
            <dd>${avgGDP.toFixed(2)}</dd>
            
            <dt>Avg Aggregate Score</dt>
            <dd>${avgAggregate ? avgAggregate.toFixed(2) : 'N/A'}</dd>
        </dl>
    `);
}

function setupYearSlider() {
    d3.select('#yearSlider').on('input', function () {
        currentYear = +this.value;
        d3.select('#yearLabel').text(currentYear);

        renderScatterPlot(globalData, currentRegion, currentYear);
    });
}




const data = await loadData();
globalData = data;



renderScatterPlot(globalData, currentRegion, currentYear);

setupZoomControls();
setupRegionControls();
setupYearSlider();


