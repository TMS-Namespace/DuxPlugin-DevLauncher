// ProviderType.qml - The one enumeration of supported IDE integration types.
// Rules: Holds the only list of integration types; a new integration adds one value here.
import QtQml

QtObject {

    // The integration types the plugin supports, one value per integration.
    enum Type {
        VSCode,
        Zed,
        Rider,
        LocalGit,
        NeoVim
    }

}
