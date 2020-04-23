import * as d3 from "d3";

/* selection of HTML and SVG elements */
let section = d3.select("#content"),
  graph = d3.select("#my_graph"),
  container = d3.select("#countries"),
  yaxis_button = d3.select("#y-axis-button"),
  play_button = d3.select("#play"),
  pause_button = d3.select("#pause"),
  //reinitialize = d3.select("#reinitialize"),
  slider = d3.select("#year");

/* display parameters */
const radius = 20,
  spacing = 3,
  time_pace = 500,
  height = 400, // section.node().getBBox().height, // height of display zone
  width = section.node().offsetWidth, // getBBox().width,  // width  of display zone
  inner_margin = 30, // margin between axes and first dot
  outer_margin = 30, // margin between axis and exterior of the display zone
  margin = inner_margin + outer_margin;

/* interaction variables */
let t_duration = 0,
  which_var = yaxis_button.property("value"),
  year_min = +slider.property("min"),
  year_current = +slider.property("value"),
  year_max = +slider.property("max"),
  year_index = year_current - year_min,
  start = false; /* added for Item 1 */

/* Item 4 : récupération de l'année min et max du fichier json*/
const recup_annees = function(countries_svg) {
  let data = countries_svg.data();
  let annee_max = d3.max(d3.max(data.map(d => d.year)));
  let annee_min = d3.min(d3.min(data.map(d => d.year)));
  return [annee_min, annee_max];
};

/* scale definition */

const compute_scales = function(countries_svg) {
  let data = countries_svg.data();
  let xMax = d3.max(data.map(d => d.income).flat()),
    xMin = d3.min(data.map(d => d.income).flat()),
    y_var = data
      .map(
        d =>
          which_var === "co2_emissions"
            ? d.co2_emissions /*[year_index]*/
            : d.life_expectancy /*[year_index]*/
      ) /*elements for Item 8 */
      .flat(),
    yMax = d3.max(y_var),
    rMax = d3.max(data.map(d => d.population).flat());
  return {
    countries_svg: countries_svg,
    x: d3
      .scaleLog()
      .domain([xMin, xMax])
      .range([margin, width - margin])
      .nice(), // .nice().tickFormat(5)
    y: d3
      .scaleLinear()
      .domain([0, yMax])
      .range([height - margin, margin])
      .unknown(height - outer_margin - inner_margin / 2),
    r: d3
      .scaleSqrt()
      .domain([0, rMax])
      .range([0, radius]),
    o: d3
      .scaleOrdinal()
      .domain(["asia", "americas", "europe", "africa"])
      .range(["#6EBB87", "#DA94CE", "#DE9D6C", "#2CB8EA"])
  };
};

/* graph construction */

function draw_yaxis({ countries_svg, x, y, r, o }) {
  graph.select("#y-axis").remove();

  let y_axis = graph
    .append("g")
    .attr("id", "y-axis")
    .attr("transform", "translate(" + outer_margin + ",0)");

  let y_label = y_axis
    .append("text")
    .attr("text-anchor", "end")
    .attr("fill", "grey")
    .attr("x", -margin)
    .attr("y", 10)
    .attr("transform", "rotate(-90)");

  y_label.text(
    which_var === "co2_emissions"
      ? "CO² Emissions (tons/year)"
      : which_var === "life_expectancy"
      ? "Life Expectancy (years)"
      : "Unknokwn variable :("
  );
  y_axis.call(d3.axisLeft().scale(y));
}

function draw_xaxis({ countries_svg, x, y, r, o }) {
  graph.select("#x-axis").remove();

  let x_axis = graph
    .append("g")
    .attr("id", "x-axis")
    .attr("transform", "translate(0," + (height - outer_margin) + ")");

  x_axis
    .append("text")
    .attr("fill", "grey")
    .attr("text-anchor", "end")
    .attr("x", width - margin)
    .attr("y", -3)
    .text(
      "Income per inhabitant at purchasing power parity " +
        "(dollars, logarithmic scale)"
    );

  x_axis.call(
    d3
      .axisBottom()
      .scale(x)
      .tickFormat(x.tickFormat(10, d3.format(",d")))
  );

  x_axis
    .attr("text-anchor", "beginning")
    .selectAll(".tick > text")
    .attr("dx", "-10")
    .filter(function(d, i, nodes) {
      return i === nodes.length - 1;
    })
    .attr("text-anchor", "end")
    .attr("dx", "10");
}

/* Item 6 : fonction qui renvoie la longueur d'un mot*/
function len(mot) {
  let len = 0;
  const letter_size = 2; /* Ici, ce n'est pas vraiment la taille d'une lettre
  mais on a été obligé de la réduire pour faire en sorte que des noms de pays entrent
  virtuellement dans les cercles et montrer que la fonctionnalité marche.*/
  len = mot.length * letter_size;
  return len;
}
//console.log(len("brigitte") / 2);

function draw_countries({ countries_svg, x, y, r, o }) {
  let transition = d3.transition().duration(t_duration);

  countries_svg.transition(transition).attr("fill", d => o(d.region));

  countries_svg
    .select("circle")
    .transition(transition)
    .attr("cx", d => x(d.income[year_index]))
    .attr("cy", d => (which_var === "none" ? 200 : y(d[which_var][year_index]))) //modified for Item 3
    .attr("r", d => r(d.population[year_index]))
    .attr("stroke", d => o(d.region));

  countries_svg.sort((a, b) => b.population - a.population);

  countries_svg
    .select("text")
    .transition(transition)
    .attr("x", d =>
      which_var === "none" || r(d.population[year_index]) * 2 > len(d.name)
        ? x(d.income[year_index] - len(d.name))
        : x(d.income[year_index]) + r(d.population[year_index]) + spacing
    ) //modified for Item 3 & Item 6
    .attr("y", d =>
      which_var === "none" ? 175 : y(d[which_var][year_index]) + 5
    ) //modified for Item 3
    .text(d => d.name);

  t_duration = 250;

  return { countries_svg, x, y, r, o };
}

/* action */
function toggle_selected() {
  this.classList.toggle("selected");
}

let t;

function start_timer() {
  if (!start) {
    if (year_current === year_max) {
      // remise à zéro
      year_current = year_min;
      document.getElementById("year_current").textContent = year_current;
      year_index = 0;
      slider.property("value", year_min);
    }

    t = d3.interval(increment, time_pace); // timer
    start = true; /* added for Item 1 */
  }
}

/* trial to make the reinitialize button work*/

/*function reinitialize_timer() {
  year_current = year_min;
  year_index = 0;
  slider.property("value", year_min);

  t = d3.interval(increment, time_pace); // timer
  start = false;
}
reinitialize.on("click", reinitialize_timer());*/

function pause_timer() {
  if (start) {
    t.stop();
    start = false; /* added for Item 1 */
  }
}

function increment() {
  if (year_current === year_max) {
    t.stop();
    start = false; /* added for Item 1 */
  } else {
    year_current += 1;
    document.getElementById("year_current").textContent = year_current;
    year_index = year_current - year_min;

    slider.property("value", year_current);
    slider.dispatch("input");
  }
}

/* data */

d3.json("data/countries.json").then(countries_json => {
  let countries_svg = container
    .selectAll("g")
    .data(countries_json)
    .join("g");

  countries_svg.append("circle");
  countries_svg.append("text");

  container.dispatch("data_ready", {
    detail: countries_svg
  });

  let annees = recup_annees(countries_svg);
  document.getElementById("year_max").textContent = annees[1];
  document.getElementById("year_min").textContent = annees[0];
  slider.property("max", annees[1]);
  slider.property("min", annees[0]);
});

/*Trials for the item 9

import { line } from "d3";

function lineb({ countries_svg, x, y }) {
  let line = d3.line();
  let zip = d3.zip();

  countries_svg
    .line(zip(income,population))
    .x(d => x(d.income))
    .y(d => y(d.population));
}*/

/* Line that follows the path of a country
d3.select(countries_json)
  .append("path")
  .attr("d", line(countries_json))
  .attr("stroke", "black")
*/

/* subscriptions */

container.on("data_ready", function() {
  let countries_svg = d3.event.detail;
  let detail = compute_scales(countries_svg);
  container.dispatch("scale_ready", { detail: detail });
});

container.on("scale_ready", function() {
  let params = d3.event.detail;
  draw_xaxis(params);
  draw_yaxis(params);
  let detail = draw_countries(params);
  container.dispatch("countries_ready", { detail: detail });
});

container.on("countries_ready", function() {
  let countries_svg = d3.event.detail;
  set_up_listeners(countries_svg);
});

function set_up_listeners({ countries_svg, x, y, r, o }) {
  countries_svg.on("click", toggle_selected);
  play_button.on("click", start_timer);
  pause_button.on("click", pause_timer);

  slider.on("input", function() {
    year_current = +slider.property("value");
    document.getElementById("year_current").textContent = year_current;
    year_index = year_current - year_min;
    draw_countries({ countries_svg, x, y, r, o });
    // elements for Item 8 :
    /*let params = compute_scales(countries_svg);
    draw_yaxis(params);*/
  });

  yaxis_button.on("change", function() {
    which_var = yaxis_button.property("value");
    let params = compute_scales(countries_svg);

    draw_countries(params);
    draw_yaxis(params);
  });
}

/* A décommenter pour tester l'animation

console.log(countries_svg.selectAll("circle").attr('cy'));
const countries = document.querySelector("#content");
countries.style.position = "absolute";
let ymax = 400,
  ymin = 500;

requestAnimationFrame(function() {
  bounce(countries, ymin, ymax, 4, 8);
});

*/

/*une fonction pour faire rebondir n fois un objet "element" entre "ymin" et "ymax"*/
function bounce(
  element,
  ymin,
  ymax,
  nb_bounce = 3,
  vitesse = 4,
  i = ymin - 1,
  up = true
) {
  if (nb_bounce < 0) {
    return 0;
  }
  if (i < ymin && i > ymax) {
    i = up ? i - vitesse : i + vitesse;
    element.style.top = `${i}px`;
    requestAnimationFrame(function() {
      bounce(element, ymin, ymax, nb_bounce, vitesse, i, up);
    });
  } else {
    up = !up;
    nb_bounce--;
    i = up ? i - vitesse : i + vitesse;
    element.style.top = `${i}px`;
    requestAnimationFrame(function() {
      bounce(element, ymin, ymax, nb_bounce, vitesse, i, up);
    });
  }
}

document.getElementById("year_current").textContent = year_current;

/*Trial for q5*/
//graph.attr("viewBox", "0 0" + width + " " + height);
