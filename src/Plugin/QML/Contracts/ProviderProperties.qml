// ProviderProperties.qml - Typed holder for one configured IDE installation.
// Rules: A plain data holder for one installation; it parses and validates nothing.
import QtQml

QtObject {
    property string providerType: ""
    property string providerId: ""
    property string installationType: ""
    property string name: ""
    property string executable: ""
    property var extraArguments: []
    property var settings: ({})
}
