import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loginRequest } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/colors';

const UI = {
  backgroundTop: '#06101D',
  backgroundBottom: '#0B1A38',
  card: 'rgba(9, 20, 43, 0.96)',
  cardBorder: 'rgba(255,255,255,0.08)',
  titleBg: '#08152C',
  titleBorder: 'rgba(255,255,255,0.08)',
  inputBg: '#0F1E3C',
  inputBorder: 'rgba(255,255,255,0.12)',
  text: '#F4F7FB',
  textSoft: '#C2CDE0',
  placeholder: '#7E8CA7',
  accent: '#F47A1F',
  accentStrong: '#FF8A2B',
  accentPressed: '#E56B12',
  errorBg: 'rgba(255, 99, 99, 0.10)',
  errorBorder: 'rgba(255, 99, 99, 0.18)',
  errorText: '#FFB0B0',
};

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width < 380;
  const isShortPhone = height < 740;

  const sidePadding = isSmallPhone ? 16 : 20;
  const cardWidth = Math.min(width - sidePadding * 2, 380);
  const cardPadding = isSmallPhone ? 18 : 22;
  const logoWidth = Math.min(cardWidth * 0.72, 250);
  const logoHeight = logoWidth * 0.34;
  const titleFontSize = isSmallPhone ? 18 : 20;
  const labelFontSize = isSmallPhone ? 14 : 15;
  const inputHeight = isSmallPhone ? 54 : 58;
  const buttonHeight = isSmallPhone ? 54 : 58;

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onMutate: () => setErrorMessage(null),
    onSuccess: (session) => {
      setSession(session);
      router.replace('/(tabs)/map');
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'No fue posible iniciar sesión.');
    },
  });

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          paddingHorizontal: sidePadding,
          paddingVertical: isShortPhone ? 16 : 24,
        },
        inner: {
          width: cardWidth,
        },
        card: {
          paddingHorizontal: cardPadding,
          paddingTop: isSmallPhone ? 24 : 28,
          paddingBottom: isSmallPhone ? 20 : 24,
          borderRadius: isSmallPhone ? 24 : 28,
        },
        logo: {
          width: logoWidth,
          height: logoHeight,
          marginBottom: isSmallPhone ? 14 : 18,
        },
        titleBox: {
          paddingHorizontal: isSmallPhone ? 14 : 16,
          paddingVertical: isSmallPhone ? 10 : 11,
          marginBottom: isSmallPhone ? 22 : 26,
        },
        title: {
          fontSize: titleFontSize,
        },
        label: {
          fontSize: labelFontSize,
        },
        input: {
          minHeight: inputHeight,
          fontSize: isSmallPhone ? 14 : 15,
          borderRadius: isSmallPhone ? 15 : 16,
        },
        buttonWrap: {
          borderRadius: isSmallPhone ? 15 : 16,
          marginTop: 6,
        },
        button: {
          minHeight: buttonHeight,
          borderRadius: isSmallPhone ? 15 : 16,
        },
        buttonText: {
          fontSize: isSmallPhone ? 16 : 17,
        },
      }),
    [
      sidePadding,
      isShortPhone,
      cardWidth,
      cardPadding,
      isSmallPhone,
      logoWidth,
      logoHeight,
      titleFontSize,
      labelFontSize,
      inputHeight,
      buttonHeight,
    ]
  );

  return (
    <LinearGradient
      colors={[UI.backgroundTop, UI.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
          >
            <View style={[styles.inner, dynamicStyles.inner]}>
              <View style={[styles.card, dynamicStyles.card]}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={dynamicStyles.logo}
                  resizeMode="contain"
                />

                <View style={[styles.titleBox, dynamicStyles.titleBox]}>
                  <Text style={[styles.title, dynamicStyles.title]}>
                    Nodus Fuel Control
                  </Text>
                </View>

                <View style={styles.form}>
                  <View style={styles.field}>
                    <Text style={[styles.label, dynamicStyles.label]}>Usuario</Text>
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                      placeholder="Ingresa tu usuario"
                      placeholderTextColor={UI.placeholder}
                      style={[styles.input, dynamicStyles.input]}
                      returnKeyType="next"
                      selectionColor={UI.accent}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={[styles.label, dynamicStyles.label]}>Contraseña</Text>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoComplete="password"
                      placeholder="Ingresa tu contraseña"
                      placeholderTextColor={UI.placeholder}
                      style={[styles.input, dynamicStyles.input]}
                      returnKeyType="done"
                      selectionColor={UI.accent}
                      onSubmitEditing={() =>
                        loginMutation.mutate({ username, password })
                      }
                    />
                  </View>

                  {errorMessage ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <Pressable
                    onPress={() => loginMutation.mutate({ username, password })}
                    disabled={loginMutation.isPending}
                    style={({ pressed }) => [
                      dynamicStyles.buttonWrap,
                      pressed && !loginMutation.isPending && styles.buttonPressed,
                    ]}
                  >
                    <LinearGradient
                      colors={[UI.accent, UI.accentStrong]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.button, dynamicStyles.button]}
                    >
                      {loginMutation.isPending ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
                          Iniciar sesión
                        </Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    overflow: 'hidden',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  inner: {
    alignSelf: 'center',
  },

  glowTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 122, 31, 0.10)',
  },

  glowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(45, 93, 180, 0.14)',
  },

  card: {
    width: '100%',
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.cardBorder,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  titleBox: {
    backgroundColor: UI.titleBg,
    borderWidth: 1,
    borderColor: UI.titleBorder,
    borderRadius: 14,
    alignSelf: 'center',
  },

  title: {
    color: UI.text,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  form: {
    width: '100%',
    gap: 16,
  },

  field: {
    gap: 8,
  },

  label: {
    color: UI.textSoft,
    fontWeight: '700',
    paddingLeft: 4,
  },

  input: {
    width: '100%',
    borderWidth: 1.2,
    borderColor: UI.inputBorder,
    backgroundColor: UI.inputBg,
    paddingHorizontal: 16,
    color: UI.text,
  },

  errorBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.errorBorder,
    backgroundColor: UI.errorBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  errorText: {
    color: UI.errorText,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  buttonWrap: {
    overflow: 'hidden',
  },

  button: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],
  },

  buttonText: {
    color: UI.backgroundTop,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});