document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('.devices-table tbody');
    const btnAddDevice = document.getElementById('btn-add-device');
    const btnCalculate = document.getElementById('btn-calculate');
    const btnGenerateGraph = document.getElementById('btn-generate-graph');
    
    // Parámetros Globales
    const factorCO2Input = document.getElementById('co2_factor');
    const periodDaysInput = document.getElementById('period_days');

    // Contenedores de Totales y Visuales
    const kwhTotalOutput = document.querySelector('.total-row .kwh-total');
    const co2TotalOutput = document.querySelector('.total-row .co2-total');
    const visualResultsSection = document.getElementById('visual-results');
    const kwhVisualOutput = document.getElementById('kwh-visual-output');
    const co2VisualOutput = document.getElementById('co2-visual-output');
    
    // Métrica de impacto
    const impactMetricDiv = document.getElementById('impact-metric');
    const metricStatusText = document.getElementById('metric-status-text');
    const metricDescription = document.getElementById('metric-description');
    
    // Variables globales para Chart.js
    let paretoChart;
    let frequencyChart;
    let pieChart;

    // Presets por tipo de dispositivo
    const devicePresets = {
        router: { watts: 30, description: 'Cisco 1941' },
        switch: { watts: 30, description: 'Switch 24 puertos' },
        computadora: { watts: 100, description: 'PC Escritorio' },
        hub: { watts: 25, description: 'Hub 8 puertos' },
        antena: { watts: 20, description: 'Antena outdoor' },
        cable: { watts: 0, description: 'UTP Cat 6 (100m)', embodied: 2 },
        otro: { watts: 50, description: 'Dispositivo genérico' }
    };

    // Función auxiliar para generar colores consistentes
    const getChartColors = (index) => {
        const colors = [
            '#0455BF', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c', '#00ADB5', '#5cb85c', '#730C02'
        ];
        return colors[index % colors.length];
    };
    
    // --- FUNCIÓN DE EVALUACIÓN DE IMPACTO ---
    const evaluateImpact = (totalCO2, periodDays) => {
        // Calcular CO2 diario
        const dailyCO2 = totalCO2 / periodDays;
        
        // Umbrales (kg CO2 por día)
        // Excelente: < 5 kg/día
        // Bueno: 5-15 kg/día
        // Moderado: 15-30 kg/día
        // Alto: > 30 kg/día
        
        if (dailyCO2 < 5) {
            impactMetricDiv.className = 'impact-metric good';
            metricStatusText.innerHTML = '✓ Excelente';
            metricDescription.textContent = 'Tu huella tecnológica es muy baja. ¡Sigue así!';
        } else if (dailyCO2 < 15) {
            impactMetricDiv.className = 'impact-metric good';
            metricStatusText.innerHTML = '✓ Bueno';
            metricDescription.textContent = 'Tu huella tecnológica es aceptable. Hay espacio para mejorar.';
        } else if (dailyCO2 < 30) {
            impactMetricDiv.className = 'impact-metric warning';
            metricStatusText.innerHTML = '⚠ Moderado';
            metricDescription.textContent = 'Tu huella tecnológica es considerable. Considera optimizar el uso de dispositivos.';
        } else {
            impactMetricDiv.className = 'impact-metric danger';
            metricStatusText.innerHTML = '✗ Alto';
            metricDescription.textContent = 'Tu huella tecnológica es alta. Es importante tomar medidas para reducir el consumo energético.';
        }
    };
    
    // --- GRÁFICO DE PARETO ---
    const updateParetoChart = (data) => {
        const ctx = document.getElementById('paretoChart').getContext('2d');
        
        if (paretoChart) {
            paretoChart.destroy();
        }
        
        // Ordenar datos de mayor a menor kWh
        const sortedData = data.map((item, index) => ({
            label: item.label,
            kwh: item.kwh,
            color: getChartColors(index)
        })).sort((a, b) => b.kwh - a.kwh);
        
        // Calcular porcentaje acumulado
        const totalKWh = sortedData.reduce((sum, item) => sum + item.kwh, 0);
        let accumulated = 0;
        const accumulatedPercentages = sortedData.map(item => {
            accumulated += item.kwh;
            return (accumulated / totalKWh) * 100;
        });
        
        paretoChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedData.map(item => item.label),
                datasets: [
                    {
                        label: 'kWh por Dispositivo',
                        data: sortedData.map(item => item.kwh),
                        backgroundColor: sortedData.map(item => item.color),
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: '% Acumulado',
                        data: accumulatedPercentages,
                        type: 'line',
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        borderWidth: 3,
                        pointRadius: 5,
                        pointBackgroundColor: '#e74c3c',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kWh'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 100,
                        title: {
                            display: true,
                            text: '% Acumulado'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.datasetIndex === 0) {
                                        label += context.parsed.y.toFixed(2) + ' kWh';
                                    } else {
                                        label += context.parsed.y.toFixed(1) + '%';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    // --- POLÍGONO DE FRECUENCIAS ---
    const updateFrequencyChart = (data) => {
        const ctx = document.getElementById('frequencyChart').getContext('2d');
        
        if (frequencyChart) {
            frequencyChart.destroy();
        }
        
        // Ordenar por kWh
        const sortedData = data.map(item => ({
            label: item.label,
            kwh: item.kwh
        })).sort((a, b) => a.kwh - b.kwh);
        
        frequencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedData.map(item => item.label),
                datasets: [{
                    label: 'kWh',
                    data: sortedData.map(item => item.kwh),
                    borderColor: '#0455BF',
                    backgroundColor: 'rgba(4, 85, 191, 0.1)',
                    borderWidth: 2,
                    pointRadius: 5,
                    pointBackgroundColor: '#0455BF',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kWh'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    };

    // --- GRÁFICO CIRCULAR ---
    const updatePieChart = (data) => {
        const ctx = document.getElementById('pieChart').getContext('2d');
        
        if (pieChart) {
            pieChart.destroy();
        }
        
        pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    data: data.map(item => item.co2),
                    backgroundColor: data.map((_, i) => getChartColors(i)),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                label += value.toFixed(2) + ' kg CO₂ (' + percentage + '%)';
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    // --- FUNCIÓN PARA CREAR NUEVA FILA ---
    const createDeviceRow = () => {
        const newRow = document.createElement('tr');
        newRow.dataset.type = 'device';
        newRow.innerHTML = `
            <td>
                <select class="device-type-select form-input-inline">
                    <option value="router">Router</option>
                    <option value="switch">Switch</option>
                    <option value="computadora">Computadora</option>
                    <option value="hub">Hub</option>
                    <option value="antena">Antena</option>
                    <option value="cable">Cable</option>
                    <option value="otro">Otro</option>
                </select>
            </td>
            <td><input type="text" value="PC Escritorio" class="input-description form-input-inline"></td>
            <td><input type="number" value="1" min="1" class="input-cantidad form-input-inline"></td>
            <td><input type="number" value="100" min="0" class="input-consumo form-input-inline"> <span class="unit-label">W</span></td>
            <td><input type="number" value="8" min="0" max="24" class="input-horas form-input-inline"></td>
            <td><input type="number" value="${periodDaysInput.value}" min="1" class="input-dias form-input-inline"></td>
            <td class="result-cell kwh-result">0.00</td>
            <td class="result-cell co2-result">0.00</td>
            <td><button class="btn-action-small btn-remove">Eliminar</button></td>
        `;
        
        // Event listener para cambio de tipo
        const typeSelect = newRow.querySelector('.device-type-select');
        typeSelect.addEventListener('change', (e) => {
            updateRowByType(newRow, e.target.value);
        });
        
        tableBody.insertBefore(newRow, tableBody.querySelector('.total-row'));
        // No calcular automáticamente, esperar a que el usuario presione "Calcular"
    };

    // --- ACTUALIZAR FILA SEGÚN TIPO ---
    const updateRowByType = (row, type) => {
        const preset = devicePresets[type];
        const descInput = row.querySelector('.input-description');
        const consumoInput = row.querySelector('.input-consumo');
        const horasInput = row.querySelector('.input-horas');
        const diasInput = row.querySelector('.input-dias');
        const unitLabel = row.querySelector('.unit-label');
        
        descInput.value = preset.description;
        
        if (type === 'cable') {
            consumoInput.value = preset.embodied || 0;
            unitLabel.textContent = 'kg';
            horasInput.value = 0;
            horasInput.disabled = true;
            diasInput.value = 0;
            diasInput.disabled = true;
            row.dataset.type = 'cable';
        } else {
            consumoInput.value = preset.watts;
            unitLabel.textContent = 'W';
            horasInput.disabled = false;
            diasInput.disabled = false;
            if (horasInput.value == 0) horasInput.value = 8;
            if (diasInput.value == 0) diasInput.value = periodDaysInput.value;
            row.dataset.type = 'device';
        }
        
        // No calcular automáticamente, esperar a que el usuario presione "Calcular"
    };

    // --- LÓGICA DE CÁLCULO ---
    const calculateResults = () => {
        const factorCO2 = parseFloat(factorCO2Input.value) || 0;
        const periodDays = parseFloat(periodDaysInput.value) || 30;
        let totalKWh = 0;
        let totalCO2 = 0;
        
        let chartData = [];

        tableBody.querySelectorAll('tr[data-type]').forEach(row => {
            const type = row.dataset.type;
            const cantidad = parseFloat(row.querySelector('.input-cantidad').value) || 0;
            const consumo = parseFloat(row.querySelector('.input-consumo').value) || 0;
            const kwhCell = row.querySelector('.kwh-result');
            const co2Cell = row.querySelector('.co2-result');
            const descriptionInput = row.querySelector('.input-description');
            const description = descriptionInput ? descriptionInput.value : '';
            
            let finalKWh = 0;
            let finalCO2 = 0;

            if (type === 'device') {
                const horasDia = parseFloat(row.querySelector('.input-horas').value) || 0;
                const dias = parseFloat(row.querySelector('.input-dias').value) || periodDays;
                
                // Fórmula: (W * Horas * Días * Cantidad) / 1000
                const kwh = (consumo * horasDia * dias * cantidad) / 1000;
                const co2 = kwh * factorCO2;

                totalKWh += kwh;
                totalCO2 += co2;
                finalKWh = kwh;
                finalCO2 = co2;

                kwhCell.textContent = kwh.toFixed(2);
                co2Cell.textContent = co2.toFixed(2);

            } else if (type === 'cable') {
                const embodiedCO2 = consumo * cantidad; 
                totalCO2 += embodiedCO2; 
                finalCO2 = embodiedCO2;

                kwhCell.textContent = '0.00';
                co2Cell.textContent = embodiedCO2.toFixed(2);
            }
            
            // Recolección de datos para gráficas
            if (finalKWh > 0 || finalCO2 > 0) {
                chartData.push({
                    label: description,
                    kwh: finalKWh,
                    co2: finalCO2
                });
            }
        });

        // Actualizar totales
        kwhTotalOutput.textContent = `${totalKWh.toFixed(2)} kWh`;
        co2TotalOutput.textContent = `${totalCO2.toFixed(2)} kg`;
        
        kwhVisualOutput.textContent = totalKWh.toFixed(2);
        co2VisualOutput.textContent = totalCO2.toFixed(2);
        
        // Actualizar gráficas si están visibles
        if (visualResultsSection.style.display === 'block') {
            updateParetoChart(chartData);
            updateFrequencyChart(chartData);
            updatePieChart(chartData);
            evaluateImpact(totalCO2, periodDays);
        }
    };

    // --- MOSTRAR RESULTADOS VISUALES ---
    const showVisualResults = () => {
        calculateResults();
        visualResultsSection.style.display = 'block';

        let chartData = [];

        tableBody.querySelectorAll('tr[data-type]').forEach(row => {
            const descriptionInput = row.querySelector('.input-description');
            const description = descriptionInput ? descriptionInput.value : '';
            const kwhValue = parseFloat(row.querySelector('.kwh-result').textContent) || 0;
            const co2Value = parseFloat(row.querySelector('.co2-result').textContent) || 0;
            
            if (kwhValue > 0 || co2Value > 0) {
                chartData.push({
                    label: description,
                    kwh: kwhValue,
                    co2: co2Value
                });
            }
        });
        
        visualResultsSection.scrollIntoView({ behavior: 'smooth' });

        updateParetoChart(chartData);
        updateFrequencyChart(chartData);
        updatePieChart(chartData);
        
        const totalCO2 = parseFloat(co2VisualOutput.textContent) || 0;
        const periodDays = parseFloat(periodDaysInput.value) || 30;
        evaluateImpact(totalCO2, periodDays);
    };

    // --- ELIMINACIÓN DE FILAS ---
    tableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove')) {
            e.target.closest('tr').remove();
            // No calcular automáticamente, esperar a que el usuario presione "Calcular"
        }
    });

    // --- RECÁLCULO AUTOMÁTICO DESHABILITADO ---
    // Ahora solo se calcula al presionar el botón "Calcular"

    // --- EVENT LISTENER PARA CAMBIO DE TIPO EN FILAS EXISTENTES ---
    tableBody.querySelectorAll('.device-type-select').forEach(select => {
        select.addEventListener('change', (e) => {
            updateRowByType(e.target.closest('tr'), e.target.value);
        });
    });

    // --- ENLAZAR BOTONES ---
    btnAddDevice.addEventListener('click', createDeviceRow);
    btnCalculate.addEventListener('click', calculateResults);
    btnGenerateGraph.addEventListener('click', showVisualResults);
    
    // Cálculo inicial al cargar la página (para la fila que ya existe)
    calculateResults();
});