// ProviderBase.qml - Abstract QML entry point that every IDE provider exports; it supplies the provider's reader component.
import QtQml

QtObject {
    // The component that reads one configured installation's recent items. The provider sets it; the plugin only instantiates it.
    property Component readerType: null
}
