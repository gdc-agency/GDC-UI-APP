import { Platform } from 'react-native';
import MaterialCommunityIconsBase from '@expo/vector-icons/MaterialCommunityIcons';

let didWarnFontObserverTimeout = false;

class MaterialCommunityIcons extends MaterialCommunityIconsBase {
  async componentDidMount() {
    this._mounted = true;

    if (this.state.fontIsLoaded) return;

    if (Platform.OS === 'web') {
      MaterialCommunityIconsBase.loadFont().catch((error) => {
        if (__DEV__ && !didWarnFontObserverTimeout) {
          didWarnFontObserverTimeout = true;
          console.warn('[icons] MaterialCommunityIcons font observer timed out; continuing with injected web font.', error);
        }
      });

      this._mounted && this.setState({ fontIsLoaded: true });
      return;
    }

    try {
      await MaterialCommunityIconsBase.loadFont();
    } catch (error) {
      throw error;
    }

    this._mounted && this.setState({ fontIsLoaded: true });
  }
}

export default MaterialCommunityIcons;
