export const APP_DEFINITIONS = {
  crops: {
    title: 'Crops',
    instructions: 'Select a single crop of interest or "all crops" to view the area where the crop(s) is grown.',
    description: '<p>"All crops" represent all of the crops that are included in the tool as displayed in the menu. The crop layers displayed on the map reflect where the harvested area exceeds 10 hectares per pixel in 2020, regardless of the timeframe selected.',
    source: '<a href="https://mapspam.info/data/" target="_blank" rel="noopener noreferrer">MapSPAM 2020</a>'
  },
  'water-risk': {
    title: 'Water Risk',
    // instructions: 'This filter is temporarily unavailable as the site undergoes maintainance. Please check back later to use this functionality.',
    description: `
      <p>The map displays the level of water risk in areas producing the selected crop(s).</p>
      <p>The table below describes each of the water risk indicators. Note that some are more relevant for irrigated agriculture,
      and some are more relevant for rainfed agriculture. Future projections are only available for water stress and seasonal
      variability and are based on business-as-usual climate change and water demand scenarios.</p>
      <div class='c-table'>
        <table class='table'>
          <tr>
            <th>Indicator</th>
            <th class='description'>Description</th>
            <th>Irrigated?</th>
            <th>Rainfed?</th>
            <th>Future Projections?</th>
          </tr>
          <tr>
            <td>Water Stress</td>
            <td>Baseline water stress measures the ratio of total water demand to available renewable surface and groundwater supplies.
            Water demand include domestic, industrial, irrigation, and livestock uses. Available renewable water supplies include the
            impact of upstream consumptive water users and large dams on downstream water availability. Higher values indicate more competition among users.
            </td>
            <td class='-a-center'>✔</td>
            <td></td>
            <td class='-a-center'>✔</td>
          </tr>
          <tr>
            <td>Interannual Variability </td>
            <td>Interannual variability measures the average betweenyear variability of available water supply, including both
            renewable surface and groundwater supplies. Higher
            values indicate wider variations in available supply from year to year.
            </td>
            <td class='-a-center'>✔</td>
            <td class='-a-center'>✔</td>
            <td></td>
          </tr>
          <tr>
            <td>Seasonal Variability</td>
            <td>Seasonal variability measures the average within-year
            variability of available water supply, including both
            renewable surface and groundwater supplies. Higher
            values indicate wider variations of available supply within a year.</td>
            <td class='-a-center'>✔</td>
            <td class='-a-center'>✔</td>
            <td class='-a-center'>✔</td>
          </tr>
          <tr>
            <td>Groundwater Table Decline</td>
            <td>Groundwater table decline measures the average decline
            of the groundwater table as the average change for the
            period of study (1990–2014). The result is expressed in
            centimeters per year (cm/yr). Higher values indicate
            higher levels of unsustainable groundwater
            withdrawals.</td>
            <td class='-a-center'>✔</td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td>Drought Risk</td>
            <td>Drought risk measures where droughts are likely to
            occur, the population and assets exposed, and the vulnerability of the population and assets to adverse effects.
            Higher values indicate higher risk of drought.</td>
            <td class='-a-center'>✔</td>
            <td class='-a-center'>✔</td>
            <td></td>
          </tr>
          <tr>
            <td>Coastal Eutrophication Potential</td>
            <td>Coastal eutrophication potential (CEP) measures the
            potential for riverine loadings of nitrogen (N), phosphorus (P), and silica (Si) to stimulate harmful algal blooms
            in coastal waters. The CEP indicator is a useful metric
            to map where anthropogenic activities produce enough
            point-source and nonpoint-source pollution to potentially
            degrade the environment. When N and P are discharged
            in excess over Si with respect to diatoms, a major type
            of algae, undesirable algal species often develop. The
            stimulation of algae leading to large blooms may in turn
            result in eutrophication and hypoxia (excessive biological
            growth and decomposition that reduces oxygen available
            to other organisms). It is therefore possible to assess the
            potential for coastal eutrophication from a river’s N, P,
            and Si loading. Higher values indicate higher levels
            of excess nutrients with respect to silica, creating more favorable conditions for harmful algal
            growth and eutrophication in coastal waters
            downstream.</td>
            <td class='-a-center'>✔</td>
            <td class='-a-center'>✔</td>
            <td></td>
          </tr>
        </table>
      <div>`,
    source: '<a href="https://doi.org/10.46830/writn.23.00061" target="_blank" rel="noopener noreferrer">Aqueduct 4.0</a>.'
  },
  'food-security': {
    title: 'Food security',
    instructions: "Select a country-level dataset to learn about the demand, production, and trade for your selected crop(s). Or, view average kilocalories per person and share of population at risk of hunger to learn more about the country's risk of food insecurity.",
    description: `<p>
        The following datasets are available for a subset of the crops at a country scale for baseline (2020) and future years. Future projections are not available if water risk indicators without future projections have been selected (i.e., interannual variability, drought risk, groundwater table decline, and coastal eutrophication potential).
      </p>
      <ul>
        <li>Food demand for crop represents the household food demand for the selected crop(s).</li>
        <li>Total crop production represents crop area harvested * crop yield. Crop net trade represents the amount traded, where positive values indicate greater exports than imports.</li>
        <li>Crop net trade represents the amount traded, where positive values indicate greater exports than imports.</li>
        <li>Kilocalories per person represents the availability of calories per person.</li>
        <li>Share of population at risk of hunger represents the percentage of the population at risk of suffering from malnourishment.</li>
      </ul>`,
    source: '<a href="https://cgspace.cgiar.org/items/7b88a53b-5f32-4405-a7d5-a0e25677b9a8" target="_blank" rel="noopener noreferrer">IFPRI IMPACT Model 3.4</a> & <a href="https://doi.org/10.1016/j.gfs.2024.100755" target="_blank" rel="noopener noreferrer">Research paper</a>'
  },
  timeframe: {
    title: 'Timeframe',
    instructions: 'Select baseline or future years of 2030 and 2050 to learn about water risk over time.',
    description: `
      <p>Baseline reflects different years depending on the dataset. Crop area baseline data are from 2020, food security baseline data are from 2020, and water risk baseline data are based on 1979 to 2019. Future projections are not available if water risk indicators without future projections have been selected (i.e., interannual variability, drought risk, groundwater table decline, and coastal eutrophication potential).</p>
      <p>In future years, select "absolute value" to see the projected water risk in the selected year. Future projections are based on business-as-usual climate change and water demand projections.</p>
    `,
    source: 'For baseline and future water risk indicators & methodology, see <a href="https://mapspam.info/data/" target="_blank" rel="noopener noreferrer">Aqueduct 4.0</a>. For Food Security projections see <a href="https://cgspace.cgiar.org/items/7b88a53b-5f32-4405-a7d5-a0e25677b9a8" target="_blank" rel="noopener noreferrer">IFPRI IMPACT Model 3.4</a>.'
  },
  area: {
    title: 'Area',
    source: '<a href="http://mapspam.info/data/" target="_blank" rel="noopener noreferrer">MapSPAM 2010</a>'
  },
  yield: {
    title: 'Yield',
    source: '<a href="http://mapspam.info/data/" target="_blank" rel="noopener noreferrer">MapSPAM 2010</a>'
  },
  'desired-condition-thresholds': {
    title: 'Desired Condition Thresholds',
    content: 'A Desired condition threshold refers to the strategic goal relating to the reduction or elimination of a water challenge. Adjust the slider based on your ambition or basin needs. The provided default values represent examples of thresholds that have been adopted by the private sector for setting contextual water targets. The map will display catchments not meeting the specified desired conditions.',
    props: {
      omitDescription: true,
      omitInstructions: true
    }
  },
  'pop-risk-hunger': {
    title: 'Population at risk of hunger',
    description: "Pop. at risk of hunger represents the percentage of each country's population at risk of suffering from malnourishment. Note that it is not crop specific.",
    source: '<a href="https://hdl.handle.net/10568/148953" target="_blank" rel="noopener noreferrer">IFPRI IMPACT Model 3.6</a> & <a href="https://doi.org/10.1016/j.gfs.2024.100755" target="_blank" rel="noopener noreferrer">Research paper</a>'
  },
  'irrigated-area-water-stress-score': {
    title: 'Irrigated Area Water Stress Score',
    source: `<a href="http://mapspam.info/data/" target="_blank" rel="noopener noreferrer">MapSPAM 2010</a>,
      <a href="https://www.wri.org/publication/aqueduct-30" target="_blank" rel="noopener noreferrer">Aqueduct 2019</a>`
  },
  'rainfed-area-drought-risk-score': {
    title: 'Rainfed Area Drought Risk Score',
    source: `<a href="http://mapspam.info/data/" target="_blank" rel="noopener noreferrer">MapSPAM 2010</a>,
      <a href="https://www.wri.org/publication/aqueduct-30" target="_blank" rel="noopener noreferrer">Aqueduct 2019</a>`
  }
};

export default { APP_DEFINITIONS };
