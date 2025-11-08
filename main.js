// Navigation bar addition
let pages = [
    { url: '', title: 'Home' },
    { url: 'about-project/', title: 'About' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const ARE_WE_HOME = document.documentElement.classList.contains('home');
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/Global-Health-BHKL-Labs/";         // GitHub Pages repo name


for (let p of pages) {
    let url = p.url;
    let title = p.title;
    url = !url.startsWith('http') ? BASE_PATH + url : url;

    // Create link and add it to nav
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);
    
    if (a.host === location.host && a.pathname === location.pathname) {
        const currentPath = location.pathname.endsWith('/') ? location.pathname + 'index.html' : location.pathname;
        const linkPath = a.pathname.endsWith('/') ? a.pathname + 'index.html' : a.pathname;
        if (linkPath === currentPath) {
            a.classList.add('current');
        }
    }
    if (a.host !== location.host) {
        a.target = '_blank';
    }
}


// Import d3 
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Similar CSV load function as recent lab
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

    const data = await d3.csv("./data/global_health_with_index.csv", (row) => {
        numericFields.forEach(f => {
            row[f] = +row[f];
        });
        return {
            ...row,
            Year: parseYear(row.Year),
            Country: row.Country?.trim?.() || "",
            Continent: row.Continent?.trim?.() || "",
        };
    });

    return data;
}


let currentTransform = d3.zoomIdentity;
let currentRegion = 'all';
let currentYear = 2021;
let globalData = null;
// Global variables for scales and dots
let xScale, yScale, rScale, colorScale, dots, svg;
let zoom;


// Create scatter plot, also similar to prev lab
function renderScatterPlot(data, regionFilter = 'all', year = 2021) {
    currentTransform = d3.zoomIdentity;
    d3.select('#chart').selectAll('*').remove();
    // Set up SVG and dimensions
    const width = 1000;
    const height = 600;

    // Margin and usable area 
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

    svg.append("defs").append("clipPath")
        .attr("id", "chart-clip") // Give it a unique ID
      .append("rect")
        // Define the clipping rectangle based on the usableArea
        .attr("x", usableArea.left)
        .attr("y", usableArea.top)
        .attr("width", usableArea.width)
        .attr("height", usableArea.height);

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
    // Scales
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
        .scaleSqrt() // Change only this line
        .domain([minLines, maxLines])
        .range([2, 30]);

    // Add gridlines BEFORE the axes
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Axis creation
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


    // add title and x-axis, y-axis
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "25px")
        .style("font-weight", "bold")
        .text("Global Health Data Analysis");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 15)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-weight", "bold")
        .text("GDP per Capita (log, USD)");

    svg.append("text")
        .attr("x", -height / 2)
        .attr("y", -20)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-weight", "bold")
        .text("Life Expectancy(Years)");


    // // Filter data for a specific year (e.g., 2021)
    // const currentYear = 2021;
    // const filteredYearData = data
    //     .filter(d => d.Year.getFullYear() === currentYear)
    //     .filter(d => d.log_GDP_Per_Capita > 0 && d.Life_Expectancy > 0);
    // xScale.domain(d3.extent(filteredYearData, d => d.log_GDP_Per_Capita)).nice();
    // yScale.domain(d3.extent(filteredYearData, d => d.Life_Expectancy)).nice();

    // Plot data points
    dots = svg.append('g')
        .attr('class', 'dots')
        .attr("clip-path", "url(#chart-clip)"); // Apply clipping path
    const sortedData = d3.sort(filteredYearData, d => -d.Total_Population);
    // change the color to show the Aggregate_Score(red is poorer,green is better)
    // let colorScale = d3.scaleOrdinal(d3.schemePastel1);
    let colorScale = d3.scaleSequential()
        .domain(d3.extent(sortedData, d => d.Aggregate_Score))
        .interpolator(d3.interpolateRdYlGn);


    dots.selectAll("circle")
        .data(sortedData)
        .join("circle")
        .attr("cx", d => xScale(d.log_GDP_Per_Capita))
        .attr("cy", d => yScale(d.Life_Expectancy))
        .attr("r", d => rScale(d.Total_Population))
        .attr("fill", d => colorScale(d.Aggregate_Score))
        .attr("fill-opacity", 0.9)
        .on("mouseenter", (event, d) => {
            d3.select(event.currentTarget)
                .attr("r", rScale(d.Total_Population) * 1.3)
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .attr("fill-opacity", 1)
            renderTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on("mouseleave", (event, d) => {
            d3.select(event.currentTarget)
                .attr("r", rScale(d.Total_Population))
                .attr("stroke", "none")
                .attr("fill-opacity", 0.85)
            updateTooltipVisibility(false);
        });

    // add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 280},400)`);
    // add legend box
    legend.append("rect")
        .attr("width", 260)
        .attr("height", 100)
        .attr("x", -20)
        .attr("y", -20)
        .attr("rx", 10)
        .attr("ry", 10)
        .style("fill", "rgba(0, 0, 0, 0.3)")
        .style("stroke", "rgba(255,255,255,0.2)")
        .style("stroke-width", 1);
    // define color
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%").attr("x2", "100%");
    // decide which part is what color 
    gradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateRdYlGn(0));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateRdYlGn(1));

    legend.append("rect")
        .attr("width", 200)
        .attr("height", 10)
        .style("fill", "url(#legendGradient)");

    legend.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .attr("fill", "white")
        .style("font-size", "12px")
        .text("Lower (Poorer)");

    legend.append("text")
        .attr("x", 200)
        .attr("y", -5)
        .attr("text-anchor", "end")
        .attr("fill", "white")
        .style("font-size", "12px")
        .text("Higher (Better)");

    // add explanation to the legend
    legend.append("text")
        .attr("x", 100)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .text("Aggregate Score");

    legend.append("text")
        .attr("x", 100)
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "11px")
        .text("Composite of Life Expectancy, GDP, Water,");

    legend.append("text")
        .attr("x", 100)
        .attr("y", 65)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "11px")
        .text("Immunization, Unemployment");


    setupZoom(usableArea, width, height);
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
    const actualGDP = Math.exp(d.log_GDP_Per_Capita);
    gdp.textContent = `$${actualGDP.toLocaleString(undefined, {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    })}`;
    lifeExpectancy.textContent = d.Life_Expectancy.toFixed(1);
    population.textContent = d.Total_Population.toLocaleString();
    aggregate.textContent = d.Aggregate_Score.toFixed(2);
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


function setupZoom(usableArea, width, height) {

    // Define handleZoom *inside* setupZoom
    function handleZoom(event) {
        currentTransform = event.transform;

        // Create the new scales, just like before
        const newXScale = currentTransform.rescaleX(xScale);
        const newYScale = currentTransform.rescaleY(yScale);

        // Update the positions of the dots
        dots.selectAll("circle")
            .attr("cx", d => newXScale(d.log_GDP_Per_Capita))
            .attr("cy", d => newYScale(d.Life_Expectancy));

        // Update the axes
        svg.select('.x-axis').call(d3.axisBottom(newXScale));
        svg.select('.y-axis').call(d3.axisLeft(newYScale));

        // Update the gridlines0 using the correct usableArea.width
        svg.select('.gridlines').call(
            d3.axisLeft(newYScale).tickFormat('').tickSize(-usableArea.width)
        );
    }

    zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .translateExtent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
        .on('zoom', handleZoom); 

    svg.call(zoom);
    svg.on('dblclick.zoom', resetZoom);
}

function resetZoom() {
    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
}

function setupZoomControls() {
    d3.select('#zoom-in').on('click', () => {
        svg.transition().duration(500).call(zoom.scaleBy, 1.3);
    });

    d3.select('#zoom-out').on('click', () => {
        svg.transition().duration(500).call(zoom.scaleBy, 0.77);
    });
    d3.select('#zoom-reset').on('click', () => {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
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

// Initializations

const data = await loadData();
globalData = data;

renderScatterPlot(globalData, currentRegion, currentYear);

setupZoomControls();
setupRegionControls();
setupYearSlider();


