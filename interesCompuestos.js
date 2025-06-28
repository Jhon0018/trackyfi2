document.getElementById('compoundInterestForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const inversion_inicial = parseFloat(document.getElementById('ci_inicial').value) || 0;
    const contribucion_mensual = parseFloat(document.getElementById('ci_mensual').value) || 0;
    const anios = parseInt(document.getElementById('ci_anios').value) || 0;
    const tasa_anual = parseFloat(document.getElementById('ci_tasa').value) || 0;
    const frecuencia_capitalizacion = document.getElementById('ci_frecuencia').value;
    const moneda = document.getElementById('ci_moneda').value || 'USD';

    const frecuencias = {
        "anual": 1,
        "semestral": 2,
        "trimestral": 4,
        "mensual": 12,
        "diaria": 365
    };

    const n = frecuencias[frecuencia_capitalizacion];
    const tasa_periodica = Math.pow(1 + tasa_anual / 100, 1 / n) - 1;
    const tiempo_meses = anios * 12;

    let total = inversion_inicial;
    let valores = [];

    for (let mes = 0; mes < tiempo_meses; mes++) {
        if (mes % (12 / n) === 0) {
            total *= (1 + tasa_periodica);
        }
        total += contribucion_mensual;
        if (mes % 12 === 11) {
            valores.push(Number(total.toFixed(2)));
        }
    }

    // Gráfica con Highcharts
    Highcharts.chart('compoundInterestChart', {
        chart: {
            type: 'areaspline',
            animation: { duration: 1500 }
        },
        title: {
            text: 'Evolución del valor del portafolio con interés compuesto'
        },
        xAxis: {
            categories: Array.from({length: anios}, (_, i) => `Año ${i+1}`),
            title: { text: 'Años' }
        },
        yAxis: {
            title: { text: `Valor del portafolio (${moneda})` }
        },
        tooltip: {
            valueDecimals: 2,
            valuePrefix: '',
            shared: true,
            formatter: function() {
                return `<b>${this.x}</b><br/>${this.series.name}: ${this.y.toLocaleString(undefined, { style: 'currency', currency: moneda })}`;
            }
        },
        plotOptions: {
            areaspline: {
                fillOpacity: 0.3,
                marker: { enabled: true, radius: 4 },
                lineWidth: 3
            }
        },
        series: [{
            name: 'Valor del portafolio',
            data: valores,
            color: '#218838'
        }]
    });

    // Mostrar resultado final
    document.getElementById('compoundInterestResult').innerHTML =
        `<strong>Valor final estimado del portafolio:</strong> <span class="text-success">${valores.length ? valores[valores.length-1].toLocaleString(undefined, { style: 'currency', currency: moneda }) : '$0'}</span>`;
});