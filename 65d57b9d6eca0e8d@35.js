function _1(md){return(
md`# Space war`
)}

async function _chart(d3,space_corrected,topojson)
{
  const width = 1100;
  const height = 620;
  const marginTop = 80;

  // ── Launch site coordinates [lon, lat] ──
  const siteCoords = {
    "Kennedy Space Center": [-80.6, 28.6],
    "Cape Canaveral": [-80.6, 28.4],
    "Vandenberg": [-120.6, 34.7],
    "Wallops Flight Facility": [-75.5, 37.8],
    "Boca Chica": [-97.2, 26],
    "Mojave Air": [-118.2, 35],
    "Kodiak": [-152.3, 57.4],
    "Corn Ranch": [-104.8, 31.4],
    "Mid-Atlantic Regional Spaceport": [-75.5, 37.8],
    "Baikonur": [63.3, 45.6],
    "Plesetsk": [40.7, 62.9],
    "Vostochny": [128.3, 51.9],
    "Kapustin Yar": [46.3, 48.6],
    "Dombarovsky": [59.8, 51.1],
    "Jiuquan": [100.3, 40.9],
    "Xichang": [102.0, 28.2],
    "Taiyuan": [112.6, 38.8],
    "Wenchang": [110.9, 19.6],
    "Tanegashima": [131.0, 30.4],
    "Uchinoura": [131.1, 31.3],
    "Guiana Space Centre": [-52.8, 5.2],
    "Satish Dhawan": [80.2, 13.7],
    "Sriharikota": [80.2, 13.7],
    "Palmachim": [34.7, 31.9],
    "Semnan": [53.9, 35.2],
    "Imam Khomeini": [53.9, 35.2],
    "Shahrud": [55.3, 36.4],
    "Mahia Peninsula": [177.9, -38.9],
    "Rocket Lab LC-1": [177.9, -38.9],
    "Sohae": [124.7, 39.7],
    "Tonghae": [129.7, 40.9],
    "Naro Space Center": [127.5, 34.4],
    "Alcantara": [-44.4, -2.3],
    "San Marco": [40.2, -2.9],
    "Woomera": [136.8, -31.2],
    "Hammaguir": [-0.3, 31.6],
    "Kwajalein": [167.7, 9],
    "Pacific Missile Range": [-159.8, 22],
    "Barents Sea": [35, 73],
    "Yellow Sea": [123, 35],
    "Gran Canaria": [-15.4, 27.9],
    "Odyssey": [-154, 0],
    "Edwards AFB": [-117.9, 34.9]
  };

  const countryFallback = {
    "USA": [-98.5, 39.8],
    "Russia": [55, 56],
    "Kazakhstan": [63.3, 45.6],
    "China": [104, 35],
    "France": [-52.7, 5.2],
    "Japan": [131, 31],
    "India": [80, 20],
    "Israel": [34.8, 31.5],
    "Iran": [53, 33],
    "New Zealand": [177, -39],
    "North Korea": [127, 40],
    "South Korea": [127, 36],
    "Brazil": [-44.4, -2.3],
    "Kenya": [40.2, -2.9],
    "Australia": [129, -13],
    "Pacific Ocean": [-154, 0],
    "New Mexico": [-106.9, 33]
  };

  const parseDate = d3.timeParse("%a %b %d, %Y %H:%M UTC");

  function geocode(loc) {
    for (const [site, c] of Object.entries(siteCoords)) {
      if (loc.includes(site)) return c;
    }
    const parts = loc.split(",").map(s => s.trim());
    const country = parts[parts.length - 1];
    return countryFallback[country] || null;
  }

  const data = space_corrected.map((d, i) => {
    const loc = d.Location || "";
    const date = parseDate(d.Datum);
    const year = date ? date.getFullYear() : null;
    const coords = geocode(loc);
    const rocket = (d[" Rocket"] || "");
    const cost = rocket ? parseFloat(rocket) : null;
    const parts = loc.split(",").map(s => s.trim());

    return {
      id: i,
      company: d["Company Name"],
      location: loc,
      site: parts.length >= 2 ? parts[1] || parts[0] : parts[0],
      country: parts[parts.length - 1],
      date,
      year,
      detail: d.Detail,
      missionName: d.Detail ? d.Detail.split("|").pop().trim() : "",
      rocketName: d.Detail ? d.Detail.split("|")[0].trim() : "",
      statusRocket: d["Status Rocket"],
      cost: isNaN(cost) ? null : cost,
      status: d["Status Mission"],
      coords
    };
  }).filter(d => d.year && d.coords);

  const years = d3.range(d3.min(data, d => d.year), d3.max(data, d => d.year) + 1);
  const byYear = d3.group(data, d => d.year);

  // ── Status colors: high contrast ──
  const statusColor = d3.scaleOrdinal()
    .domain(["Success", "Failure", "Partial Failure", "Prelaunch Failure"])
    .range(["#00e676", "#ff1744", "#ffea00", "#d500f9"]);

  // ── Company → symbol shape ──
  const topCompanies = d3.rollups(data, v => v.length, d => d.company)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(d => d[0]);

  const symbolTypes = [
    d3.symbolCircle,
    d3.symbolDiamond,
    d3.symbolSquare,
    d3.symbolTriangle,
    d3.symbolStar,
    d3.symbolCross,
    d3.symbolWye,
    d3.symbolCircle,    // repeated with different size
    d3.symbolDiamond,
    d3.symbolSquare
  ];

  const companySymbol = new Map();
  topCompanies.forEach((c, i) => companySymbol.set(c, symbolTypes[i]));

  // ── Company origin country ──
  const companyCountry = {
    "RVSN USSR": "USSR/Russia", "Roscosmos": "Russia", "VKS RF": "Russia",
    "Kosmotras": "Russia", "Khrunichev": "Russia", "Land Launch": "Russia",
    "Starsem": "Russia/France", "ILS": "USA/Russia", "Sea Launch": "USA/Russia/Ukraine/Norway",
    "Eurockot": "Russia/Germany", "Yuzhmash": "Ukraine", "OKB-586": "USSR/Ukraine",
    "SpaceX": "USA", "NASA": "USA", "ULA": "USA", "Boeing": "USA",
    "Lockheed": "USA", "Martin Marietta": "USA", "General Dynamics": "USA",
    "Northrop": "USA", "US Air Force": "USA", "US Navy": "USA",
    "Blue Origin": "USA", "Rocket Lab": "USA/New Zealand",
    "Virgin Orbit": "USA", "AMBA": "USA", "Douglas": "USA",
    "Exos": "USA", "Sandia": "USA", "EER": "USA", "SRC": "USA",
    "CASC": "China", "ExPace": "China", "CASIC": "China",
    "i-Space": "China", "OneSpace": "China", "Landspace": "China",
    "Arianespace": "France/Europe", "CNES": "France", "ESA": "Europe",
    "Arm\u00e9e de l'Air": "France", "CECLES": "France/Europe",
    "ASI": "Italy", "MHI": "Japan", "JAXA": "Japan",
    "ISAS": "Japan", "MITT": "Japan", "UT": "Japan",
    "ISRO": "India", "IAI": "Israel", "ISA": "Iran",
    "IRGC": "Iran", "KCST": "North Korea", "KARI": "South Korea",
    "AEB": "Brazil", "RAE": "UK"
  };

  const nodeRadius = 4;
  const nodeSize = nodeRadius * nodeRadius * Math.PI * 0.55; // symbol size ≈ area

  // ── Force-based layout: spread nodes so they never overlap ──
  function layoutNodes(launches) {
    const siteKey = d => `${d.coords[0]},${d.coords[1]}`;
    const bySite = d3.group(launches, siteKey);
    const positioned = [];

    for (const [, siteLaunches] of bySite) {
      const [cx, cy] = projection(siteLaunches[0].coords);
      const nodes = siteLaunches.map((d, i) => ({
        ...d,
        x: cx + (Math.random() - 0.5) * 4,
        y: cy + (Math.random() - 0.5) * 4,
        anchorX: cx,
        anchorY: cy
      }));

      // Run a tiny force sim in pixel space
      const sim = d3.forceSimulation(nodes)
        .force("collide", d3.forceCollide(nodeRadius + 1.0).strength(1).iterations(4))
        .force("x", d3.forceX(d => d.anchorX).strength(0.15))
        .force("y", d3.forceY(d => d.anchorY).strength(0.15))
        .stop();

      // Tick enough to resolve overlaps
      for (let i = 0; i < 80; i++) sim.tick();

      positioned.push(...nodes);
    }
    return positioned;
  }

  // ── Load world ──
  const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  const land = topojson.feature(world, world.objects.countries);

  // ── Projection ──
  const projection = d3.geoNaturalEarth1()
    .fitSize([width, height - marginTop], { type: "Sphere" });
  const path = d3.geoPath(projection);

  // ── SVG ──
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height + 240])
    .attr("width", width)
    .style("background", "#06081a")
    .style("font-family", "'Segoe UI', system-ui, sans-serif");

  // ── Glow filter ──
  const defs = svg.append("defs");
  const glow = defs.append("filter").attr("id", "glow");
  glow.append("feGaussianBlur").attr("stdDeviation", 2).attr("result", "blur");
  const merge = glow.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  // Failure pulse filter
  const pulse = defs.append("filter").attr("id", "fail-glow");
  pulse.append("feGaussianBlur").attr("stdDeviation", 4).attr("result", "blur");
  const merge2 = pulse.append("feMerge");
  merge2.append("feMergeNode").attr("in", "blur");
  merge2.append("feMergeNode").attr("in", "SourceGraphic");

  // ── Title ──
  svg.append("text")
    .attr("x", width / 2).attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("fill", "#7a9cff")
    .attr("font-size", 16)
    .attr("font-weight", 300)
    .attr("letter-spacing", 3)
    .text("GLOBAL SPACE EXPLORATION LAUNCHES");

  const yearLabel = svg.append("text")
    .attr("x", width / 2).attr("y", 56)
    .attr("text-anchor", "middle")
    .attr("fill", "#fff")
    .attr("font-size", 36)
    .attr("font-weight", 700);

  const statsLabel = svg.append("text")
    .attr("x", width / 2).attr("y", 74)
    .attr("text-anchor", "middle")
    .attr("fill", "#6a7aaa")
    .attr("font-size", 12);

  // ── Map ──
  const mapG = svg.append("g").attr("transform", `translate(0,${marginTop})`);

  mapG.append("path")
    .datum({ type: "Sphere" })
    .attr("d", path)
    .attr("fill", "#0b0f28")
    .attr("stroke", "#1a2050")
    .attr("stroke-width", 0.5);

  mapG.append("path")
    .datum(d3.geoGraticule10())
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#111838")
    .attr("stroke-width", 0.3);

  mapG.selectAll("path.land")
    .data(land.features)
    .join("path")
    .attr("class", "land")
    .attr("d", path)
    .attr("fill", "#141e48")
    .attr("stroke", "#1e2e68")
    .attr("stroke-width", 0.4);

  // ── Tooltip ──
  const tooltip = d3.select(document.body).append("div")
    .style("position", "fixed")
    .style("pointer-events", "none")
    .style("background", "rgba(6, 8, 26, 0.97)")
    .style("border", "1px solid #3a4a8a")
    .style("border-radius", "10px")
    .style("padding", "14px 18px")
    .style("font-size", "12.5px")
    .style("line-height", "1.8")
    .style("max-width", "360px")
    .style("color", "#c8d0e8")
    .style("box-shadow", "0 8px 32px rgba(0,0,0,0.7)")
    .style("z-index", "10000")
    .style("opacity", 0)
    .style("font-family", "'Segoe UI', system-ui, sans-serif");

  // ── Launch nodes layer ──
  const nodesG = mapG.append("g");

  // ── Render ──
  function renderYear(yr) {
    const launches = byYear.get(yr) || [];
    const total = launches.length;
    const successes = launches.filter(d => d.status === "Success").length;
    const failures = launches.filter(d => d.status === "Failure").length;
    const partials = launches.filter(d => d.status === "Partial Failure").length;

    yearLabel.text(yr);
    statsLabel.text(
      `${total} launches  ·  ${successes} success  ·  ${failures} fail  ·  ${partials} partial  ·  ` +
      `${d3.rollups(launches, v => v.length, d => d.company).length} orgs`
    );

    // Force-layout nodes so they don't overlap
    const positioned = layoutNodes(launches);

    // Data join
    const nodes = nodesG.selectAll("path.launch")
      .data(positioned, d => d.id);

    nodes.exit()
      .transition().duration(250)
      .attr("opacity", 0)
      .remove();

    const enter = nodes.enter().append("path")
      .attr("class", "launch")
      .attr("opacity", 0)
      .attr("cursor", "pointer");

    const allNodes = enter.merge(nodes);

    allNodes.each(function(d) {
      const sym = companySymbol.get(d.company) || d3.symbolCircle;
      const isFail = d.status !== "Success";
      const isYuzhmash = d.company === "Yuzhmash";
      const size = isFail ? nodeSize * 1.4 : nodeSize;
      const fill = isYuzhmash ? "#2196f3" : statusColor(d.status);
      d3.select(this)
        .attr("d", d3.symbol().type(sym).size(size)())
        .attr("fill", fill)
        .attr("fill-opacity", isYuzhmash ? 1 : (isFail ? 0.95 : 0.8))
        .attr("stroke", isYuzhmash ? "#90caf9" : (isFail ? "#fff" : "none"))
        .attr("stroke-width", isYuzhmash ? 1.5 : (isFail ? 1 : 0))
        .style("filter", isYuzhmash ? "url(#fail-glow)" : (isFail ? "url(#fail-glow)" : "url(#glow)"));
    });

    // Animate position
    allNodes.transition().duration(500)
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .attr("opacity", 1);

    // Interactions (re-bindafter merge)
    allNodes
      .on("mouseover", function(event, d) {
        d3.select(this)
          .raise()
          .transition().duration(100)
          .attr("d", d3.symbol().type(companySymbol.get(d.company) || d3.symbolCircle).size(nodeSize * 4)())
          .attr("fill-opacity", 1)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);

        const sc = statusColor(d.status);

        let html = `<div style="font-size:14px;font-weight:700;color:${sc};margin-bottom:4px;">
          ${d.status.toUpperCase()}</div>`;
        html += `<div style="font-size:13px;font-weight:600;color:#a8c0ff;margin-bottom:6px;">
          ${d.missionName || d.detail}</div>`;
        html += `<div><span style="color:#6a7aaa;">Rocket:</span> ${d.rocketName}</div>`;
        const origin = companyCountry[d.company] || "Unknown";
        html += `<div><span style="color:#6a7aaa;">Company:</span> <b>${d.company}</b> <span style="color:#7a9cff;">(${origin})</span></div>`;
        html += `<div><span style="color:#6a7aaa;">Launch site:</span> ${d.site}</div>`;
        html += `<div><span style="color:#6a7aaa;">Site country:</span> ${d.country}</div>`;
        if (d.date) {
          html += `<div><span style="color:#6a7aaa;">Date:</span> ${d3.timeFormat("%b %d, %Y")(d.date)}</div>`;
        }
        if (d.cost) {
          html += `<div><span style="color:#6a7aaa;">Cost:</span> $${d.cost}M</div>`;
        }
        html += `<div><span style="color:#6a7aaa;">Rocket status:</span> ${d.statusRocket ? d.statusRocket.replace("Status", "") : "—"}</div>`;

        tooltip.html(html).style("opacity", 1);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.clientX + 18) + "px")
          .style("top", (event.clientY - 12) + "px");
      })
      .on("mouseout", function(event, d) {
        const sym = companySymbol.get(d.company) || d3.symbolCircle;
        const isFail = d.status !== "Success";
        d3.select(this)
          .transition().duration(200)
          .attr("d", d3.symbol().type(sym).size(isFail ? nodeSize * 1.4 : nodeSize)())
          .attr("fill-opacity", isFail ? 0.95 : 0.8)
          .attr("stroke", isFail ? "#fff" : "none")
          .attr("stroke-width", isFail ? 1 : 0);
        tooltip.style("opacity", 0);
      });
  }

  // ── Legend: Mission Status ──
  const legY = height + 20;
  const statusLeg = svg.append("g").attr("transform", `translate(40, ${legY})`);
  statusLeg.append("text")
    .attr("fill", "#6a7aaa").attr("font-size", 11).attr("font-weight", 700)
    .text("MISSION STATUS");

  const statusDomain = ["Success", "Failure", "Partial Failure", "Prelaunch Failure"];
  statusDomain.forEach((s, i) => {
    const g = statusLeg.append("g").attr("transform", `translate(${i * 140}, 20)`);
    g.append("circle").attr("r", 6).attr("fill", statusColor(s));
    if (s !== "Success") {
      g.append("circle").attr("r", 6).attr("fill", "none")
        .attr("stroke", "#fff").attr("stroke-width", 0.8);
    }
    g.append("text").attr("x", 12).attr("dy", "0.35em")
      .attr("fill", "#c0c8e0").attr("font-size", 11).text(s);
  });

  // Failure note
  statusLeg.append("text")
    .attr("y", 40).attr("fill", "#556").attr("font-size", 10)
    .text("Failures are slightly larger with white outline and glow");

  // ── Legend: Company Shapes ──
  const compLeg = svg.append("g").attr("transform", `translate(40, ${legY + 60})`);
  compLeg.append("text")
    .attr("fill", "#6a7aaa").attr("font-size", 11).attr("font-weight", 700)
    .text("TOP LAUNCH PROVIDERS (by shape)");

  topCompanies.forEach((c, i) => {
    const col = Math.floor(i / 5);
    const row = i % 5;
    const g = compLeg.append("g").attr("transform", `translate(${col * 220}, ${row * 20 + 18})`);
    g.append("path")
      .attr("d", d3.symbol().type(companySymbol.get(c)).size(60)())
      .attr("fill", "#8a9cc0");
    g.append("text").attr("x", 14).attr("dy", "0.35em")
      .attr("fill", "#c0c8e0").attr("font-size", 10.5).text(c);
  });

  compLeg.append("g")
    .attr("transform", `translate(${Math.ceil(topCompanies.length / 5) * 220}, 18)`)
    .call(g => {
      g.append("path")
        .attr("d", d3.symbol().type(d3.symbolCircle).size(60)())
        .attr("fill", "#8a9cc0");
      g.append("text").attr("x", 14).attr("dy", "0.35em")
        .attr("fill", "#888").attr("font-size", 10.5).text("Others");
    });

  // ── Controls ──
  const ctrlY = height + 225;
  const ctrlG = svg.append("g").attr("transform", `translate(${width / 2}, ${ctrlY})`);

  let currentYear = years[0];

  function goToYear(yr) {
    currentYear = Math.max(years[0], Math.min(years[years.length - 1], yr));
    renderYear(currentYear);
    sliderInput.property("value", currentYear);
  }

  // Left arrow
  const leftBtn = ctrlG.append("g").attr("transform", "translate(-260, 0)").attr("cursor", "pointer");
  leftBtn.append("rect")
    .attr("x", -20).attr("y", -14).attr("width", 40).attr("height", 28)
    .attr("rx", 6).attr("fill", "#1e2a5a").attr("stroke", "#3a4a8a");
  leftBtn.append("text")
    .attr("text-anchor", "middle").attr("dy", "0.35em")
    .attr("fill", "#e0e0e0").attr("font-size", 16).text("\u25C0");
  leftBtn.on("click", () => goToYear(currentYear - 1));

  // Right arrow
  const rightBtn = ctrlG.append("g").attr("transform", "translate(260, 0)").attr("cursor", "pointer");
  rightBtn.append("rect")
    .attr("x", -20).attr("y", -14).attr("width", 40).attr("height", 28)
    .attr("rx", 6).attr("fill", "#1e2a5a").attr("stroke", "#3a4a8a");
  rightBtn.append("text")
    .attr("text-anchor", "middle").attr("dy", "0.35em")
    .attr("fill", "#e0e0e0").attr("font-size", 16).text("\u25B6");
  rightBtn.on("click", () => goToYear(currentYear + 1));

  // Slider
  const fo = ctrlG.append("foreignObject")
    .attr("x", -220).attr("y", -14).attr("width", 440).attr("height", 30);
  const sliderInput = fo.append("xhtml:input")
    .attr("type", "range")
    .attr("min", years[0]).attr("max", years[years.length - 1])
    .attr("value", years[0]).attr("step", 1)
    .style("width", "430px")
    .style("accent-color", "#6a8aff")
    .on("input", function() {
      goToYear(+this.value);
    });

  // ── Initial render ──
  renderYear(years[0]);

  return svg.node();
}


function _space_corrected(__query,FileAttachment,invalidation){return(
__query(FileAttachment("Space_Corrected.csv"),{from:{table:"Space_Corrected"},sort:[],slice:{to:null,from:null},filter:[],select:{columns:null}},invalidation)
)}

function _space_corrected1(__query,FileAttachment,invalidation){return(
__query(FileAttachment("Space_Corrected.csv"),{from:{table:"Space_Corrected"},sort:[],slice:{to:null,from:null},filter:[],select:{columns:null}},invalidation)
)}

export default function define(runtime, observer) {
  const main = runtime.module();
  function toString() { return this.url; }
  const fileAttachments = new Map([
    ["Space_Corrected.csv", {url: new URL("./files/5780855baace1a4634ea90a3cd318925961a8668d0401dda9aca471d0b0934ad8383b814ea816aebde1ed1fb90dfa82fcc76280080befc85e6773bd5c2560dad.csv", import.meta.url), mimeType: "text/csv", toString}]
  ]);
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer("chart")).define("chart", ["d3","space_corrected","topojson"], _chart);
  main.variable(observer("space_corrected")).define("space_corrected", ["__query","FileAttachment","invalidation"], _space_corrected);
  main.variable(observer("space_corrected1")).define("space_corrected1", ["__query","FileAttachment","invalidation"], _space_corrected1);
  return main;
}
