// ProviderProperties.qml - Typed holder for one configured IDE installation.
import QtQml

QtObject {
    property string providerType: ""
    property string providerId: ""
    property string name: ""
    property string executable: ""
    property var extraArguments: []
    property var settings: ({})
}
