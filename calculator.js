document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('.devices-table tbody');
    const btnAddDevice = document.querySelector('.action-buttons button:nth-child(1)');
    const btnAddCable = document.querySelector('.action-buttons button:nth-child(2)');
    const btnCalculate = document.querySelector('.action-buttons button:nth-child(3)');
    const btnGenerateGraph = document.querySelector('.action-buttons button:nth-child(4)'); 
    
    // Parámetros Globales
    const factorCO2Input = document.getElementById('co2_factor');
    const periodDaysInput = document.getElementById('period_days');

    // Contenedores de Totales y Visuales
    const kwhTotalOutput = document.querySelector('.total-row .kwh-total');
    const co2TotalOutput = document.querySelector('.total-row .co2-total');
    const visualResultsSection = document.getElementById('visual-results');
    const kwhVisualOutput = document.getElementById('kwh-visual-output');
    const co2VisualOutput = document.getElementById('co2-visual-output');
    
    // Variable global para Chart.js
    let resultsChart; 

    // Función auxiliar para generar colores consistentes
    const getChartColors = (index) => {
        const colors = [
            '#0455BF', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c', '#00ADB5', '#5cb85c', '#730C02'
        ];
        return colors[index % colors.length];
    };
    
    // --- LÓGICA DE LA GRÁFICA ---
    const updateChart = (data) => {
        const ctx = document.getElementById('resultsChart').getContext('2d');
        
        // Destruir la gráfica anterior si existe
        if (resultsChart) {
            resultsChart.destroy();
        }
        
        // Crear la nueva gráfica (gráfico de barras)
        resultsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels, 
                datasets: [{
                    label: 'CO₂ por Dispositivo (kg)',
                    data: data.co2Data, 
                    backgroundColor: data.co2Data.map((_, i) => getChartColors(i)),
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Emisiones de CO₂ (kg)'
                        }
                    },
                    x: {
                        ticks: {
                            // Opcional: Rotar etiquetas del eje X si son largas
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Ocultar la leyenda si solo hay una serie
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('es-MX', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(context.parsed.y) + ' kg';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };
    // ----------------------------


    // Función para crear una nueva fila de dispositivo (consumo W)
    const createDeviceRow = () => {
        const newRow = document.createElement('tr');
        newRow.dataset.type = 'device';
        newRow.innerHTML = `
            <td>Dispositivo</td>
            <td><input type="text" value="PC Escritorio" class="input-description form-input-inline"></td>
            <td><input type="number" value="1" min="1" class="input-cantidad form-input-inline"></td>
            <td><input type="number" value="100" class="input-consumo form-input-inline"> W</td>
            <td><input type="number" value="8" class="input-horas form-input-inline"></td>
            <td><input type="text" value="${periodDaysInput.value}" class="input-dias form-input-inline"></td>
            <td class="result-cell kwh-result">0.00</td>
            <td class="result-cell co2-result">0.00</td>
            <td><button class="btn-action-small btn-remove">Eliminar</button></td>
        `;
        // Insertar antes de la fila de totales
        tableBody.insertBefore(newRow, tableBody.querySelector('.total-row'));
        calculateResults();
    };

    // Función para crear una nueva fila de cable (CO2 incorporado)
    const createCableRow = () => {
        const newRow = document.createElement('tr');
        newRow.dataset.type = 'cable';
        newRow.innerHTML = `
            <td>Cable</td>
            <td><input type="text" value="UTP Cat 6 (100m)" class="input-description form-input-inline"></td>
            <td><input type="number" value="1" min="1" class="input-cantidad form-input-inline"></td>
            <td><input type="number" value="2" class="input-consumo form-input-inline"> kg</td>
            <td>N/A</td>
            <td>N/A</td>
            <td class="result-cell kwh-result">0.00</td>
            <td class="result-cell co2-result">0.00</td>
            <td><button class="btn-action-small btn-remove">Eliminar</button></td>
        `;
        tableBody.insertBefore(newRow, tableBody.querySelector('.total-row'));
        calculateResults();
    };


    // Lógica de Cálculo (modificada para recopilar datos para la gráfica)
    const calculateResults = () => {
        const factorCO2 = parseFloat(factorCO2Input.value) || 0;
        const periodDays = parseFloat(periodDaysInput.value) || 30;
        let totalKWh = 0;
        let totalCO2 = 0;
        
        let chartLabels = [];
        let chartCo2Data = [];

        tableBody.querySelectorAll('tr[data-type]').forEach(row => {
            const type = row.dataset.type;
            const cantidad = parseFloat(row.querySelector('.input-cantidad').value) || 0;
            const consumo = parseFloat(row.querySelector('.input-consumo').value) || 0;
            const kwhCell = row.querySelector('.kwh-result');
            const co2Cell = row.querySelector('.co2-result');
            const descriptionInput = row.querySelector('.input-description');
            const description = descriptionInput ? descriptionInput.value : ''; // Asegurarse de que exista el input
            
            let finalCO2 = 0;

            if (type === 'device') {
                const horasDia = parseFloat(row.querySelector('.input-horas').value) || 0;
                
                // Fórmula: (W * Horas * Días * Cantidad) / 1000
                const kwh = (consumo * horasDia * periodDays * cantidad) / 1000;
                const co2 = kwh * factorCO2;

                totalKWh += kwh;
                totalCO2 += co2;
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
            
            // Recolección de datos para la gráfica (solo si hay emisión de CO2)
            if (finalCO2 > 0) {
                chartLabels.push(description);
                chartCo2Data.push(finalCO2);
            }
        });

        // Actualizar totales en la fila de resumen
        kwhTotalOutput.textContent = `${totalKWh.toFixed(2)} kWh`;
        co2TotalOutput.textContent = `${totalCO2.toFixed(2)} kg`;
        
        // Actualizar valores en el área visual
        kwhVisualOutput.textContent = totalKWh.toFixed(2);
        co2VisualOutput.textContent = totalCO2.toFixed(2);
        
        // Si el área visual está visible, actualizar la gráfica inmediatamente
        if (visualResultsSection.style.display === 'block') {
             updateChart({ labels: chartLabels, co2Data: chartCo2Data });
        }
    };

    // Lógica para mostrar el área de Resultados Visuales y dibujar la gráfica
    const showVisualResults = () => {
        calculateResults(); 
        visualResultsSection.style.display = 'block';

        let chartLabels = [];
        let chartCo2Data = [];

        // Recolectar datos nuevamente para la gráfica
        tableBody.querySelectorAll('tr[data-type]').forEach(row => {
            const descriptionInput = row.querySelector('.input-description');
            const description = descriptionInput ? descriptionInput.value : '';
            const co2Value = parseFloat(row.querySelector('.co2-result').textContent) || 0;
            
            if (co2Value > 0) {
                chartLabels.push(description);
                chartCo2Data.push(co2Value);
            }
        });
        
        // Desplazar la vista a la sección de resultados
        visualResultsSection.scrollIntoView({ behavior: 'smooth' });

        updateChart({ labels: chartLabels, co2Data: chartCo2Data });
    };

    // Lógica de Eliminación (Event Delegation)
    tableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove')) {
            e.target.closest('tr').remove();
            calculateResults(); 
        }
    });

    // Recálculo automático al cambiar inputs en la tabla o parámetros
    document.addEventListener('input', (e) => {
        // Recalcular si el input está dentro de la tabla o es uno de los parámetros de control
        if (e.target.closest('.devices-table') || e.target === factorCO2Input || e.target === periodDaysInput) {
            calculateResults();
        }
    });


    // Enlazar los botones de acción
    btnAddDevice.addEventListener('click', createDeviceRow);
    btnAddCable.addEventListener('click', createCableRow);
    btnCalculate.addEventListener('click', calculateResults);
    btnGenerateGraph.addEventListener('click', showVisualResults); 
    
    // Ejecutar un cálculo inicial al cargar la página
    calculateResults();
});