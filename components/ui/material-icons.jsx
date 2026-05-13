import { Platform } from 'react-native';
import MaterialIconsBase from '@expo/vector-icons/MaterialIcons';

let didWarnFontObserverTimeout = false;

class MaterialIcons extends MaterialIconsBase {
  async componentDidMount() {
    this._mounted = true;

    if (this.state.fontIsLoaded) return;

    if (Platform.OS === 'web') {
      MaterialIconsBase.loadFont().catch((error) => {
        if (__DEV__ && !didWarnFontObserverTimeout) {
          didWarnFontObserverTimeout = true;
          console.warn('[icons] MaterialIcons font observer timed out; continuing with injected web font.', error);
        }
      });

      this._mounted && this.setState({ fontIsLoaded: true });
      return;
    }

    try {
      await MaterialIconsBase.loadFont();
    } catch (error) {
      throw error;
    }

    this._mounted && this.setState({ fontIsLoaded: true });
  }
}

export default MaterialIcons;
