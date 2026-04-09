import { StyleSheet, Text, View } from 'react-native';

import { formatDateTime, formatLiters } from '@/utils/format';

import { ReportsStateBox } from './ReportsStateBox';
import {
  formatDateLabel,
  formatDisplayDate,
  formatTimeLabel,
} from './reportsDateUtils';
import {
  ACCENT_ORANGE,
  BORDER_SOFT,
  SURFACE_CARD,
  SURFACE_CARD_ALT,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from './reportsTheme';

type ReportSummary = {
  totalLiters: number;
  totalEvents: number;
  firstEvent?: string | null;
  lastEvent?: string | null;
};

type ReportsResultsProps = {
  submitted: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
  report: ReportSummary;
  events: unknown[];
  dateFrom: string;
  dateTo: string;
};

export function ReportsResults({
  submitted,
  isFetching,
  isError,
  errorMessage,
  report,
  events,
  dateFrom,
  dateTo,
}: ReportsResultsProps) {
  if (isFetching) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Resultado</Text>
        <ReportsStateBox
          badge="Cargando"
          title="Construyendo reporte"
          description="Estamos consolidando los eventos reales del período consultado."
        />
      </View>
    );
  }

  if (!submitted) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Resultado</Text>
        <ReportsStateBox
          badge="Pendiente"
          title="Reporte pendiente"
          description="Selecciona equipo y fechas para consolidar los eventos de combustible."
          tone="warning"
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Resultado</Text>
        <ReportsStateBox
          badge="Error"
          title="No fue posible generar el reporte"
          description={errorMessage || 'Revisa el endpoint de variables.'}
          tone="error"
        />
      </View>
    );
  }

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Vista general</Text>

        <View style={styles.overviewHero}>
          <View style={styles.overviewHeroMain}>
            <Text style={styles.overviewHeroLabel}>Total del período</Text>
            <Text style={styles.overviewHeroValue}>
              {formatLiters(report.totalLiters)}
            </Text>
            <Text style={styles.overviewHeroCaption}>
              Consumo consolidado para el rango seleccionado
            </Text>
          </View>

          <View style={styles.overviewSide}>
            <View style={styles.sideStatCard}>
              <Text style={styles.sideStatLabel}>Eventos</Text>
              <Text style={styles.sideStatValue}>{report.totalEvents}</Text>
            </View>

            <View style={styles.sideStatCard}>
              <Text style={styles.sideStatLabel}>Período</Text>
              <Text style={styles.sideStatText}>
                {formatDisplayDate(dateFrom)} - {formatDisplayDate(dateTo)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Primer evento</Text>
            <Text style={styles.detailDate}>
              {formatDateLabel(report.firstEvent)}
            </Text>
            <Text style={styles.detailTime}>
              {formatTimeLabel(report.firstEvent)}
            </Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Último evento</Text>
            <Text style={styles.detailDate}>
              {formatDateLabel(report.lastEvent)}
            </Text>
            <Text style={styles.detailTime}>
              {formatTimeLabel(report.lastEvent)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Lectura operativa</Text>

        {events.length === 0 ? (
          <ReportsStateBox
            badge="Vacío"
            title="Sin datos en el rango"
            description="No se detectaron eventos LitrosT para este equipo dentro del período seleccionado."
          />
        ) : (
          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>Rendimiento del período</Text>
              <Text style={styles.insightText}>
                Se registraron <Text style={styles.highlight}>{report.totalEvents}</Text>{' '}
                eventos con un acumulado de{' '}
                <Text style={styles.highlight}>{formatLiters(report.totalLiters)}</Text>.
              </Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>Ventana operativa</Text>
              <Text style={styles.insightText}>
                La actividad comenzó el{' '}
                <Text style={styles.highlight}>{formatDateTime(report.firstEvent)}</Text>{' '}
                y cerró el{' '}
                <Text style={styles.highlight}>{formatDateTime(report.lastEvent)}</Text>.
              </Text>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    padding: 14,
  },

  panelTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  overviewHero: {
    gap: 10,
  },

  overviewHeroMain: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    padding: 16,
  },

  overviewHeroLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  overviewHeroValue: {
    color: ACCENT_ORANGE,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 6,
  },

  overviewHeroCaption: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },

  overviewSide: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  sideStatCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    padding: 14,
  },

  sideStatLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  sideStatValue: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '900',
  },

  sideStatText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },

  detailCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    padding: 14,
  },

  detailLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  detailDate: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },

  detailTime: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
  },

  insightsGrid: {
    gap: 10,
  },

  insightCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    padding: 16,
  },

  insightTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },

  insightText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 22,
  },

  highlight: {
    color: ACCENT_ORANGE,
    fontWeight: '800',
  },
});