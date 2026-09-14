import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  skillClient: {
    installFromFolder: vi.fn(),
    installFromZip: vi.fn(),
    installFromUrl: vi.fn()
  },
  deviceClient: {
    selectDirectory: vi.fn()
  }
}))

vi.mock('@api/SkillClient', () => ({
  createSkillClient: () => mocks.skillClient
}))
vi.mock('@api/DeviceClient', () => ({
  createDeviceClient: () => mocks.deviceClient
}))
vi.mock('@api/FileClient', () => ({
  createFileClient: () => ({ getPathForFile: () => null })
}))
vi.mock('@renderer-notifications/rendererNotificationPort', () => ({
  notifyRenderer: vi.fn()
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key
  })
}))
vi.mock('@iconify/vue', () => ({
  Icon: defineComponent({ name: 'Icon', template: '<span />' })
}))

const passthrough = (name: string) =>
  defineComponent({
    name,
    template: '<div><slot /></div>'
  })

const DialogStub = defineComponent({
  name: 'Dialog',
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div><slot /></div>'
})

const DcInlineErrorStub = defineComponent({
  name: 'DcInlineError',
  props: { error: String },
  template: '<p role="alert">{{ error }}</p>'
})

const DcSubmitButtonStub = defineComponent({
  name: 'DcSubmitButton',
  inheritAttrs: false,
  props: { status: String, disabled: Boolean },
  template: '<button v-bind="$attrs" :disabled="disabled"><slot /></button>'
})

const InputStub = defineComponent({
  name: 'Input',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<input />'
})

const mountDialog = async () => {
  const Dialog = (
    await import('../../../src/renderer/src/pages/plugins/skills/SkillInstallDialog.vue')
  ).default
  return mount(Dialog, {
    props: { open: true },
    global: {
      stubs: {
        Dialog: DialogStub,
        DialogContent: passthrough('DialogContent'),
        DialogDescription: passthrough('DialogDescription'),
        DialogHeader: passthrough('DialogHeader'),
        DialogTitle: passthrough('DialogTitle'),
        Tabs: passthrough('Tabs'),
        TabsList: passthrough('TabsList'),
        TabsTrigger: passthrough('TabsTrigger'),
        TabsContent: passthrough('TabsContent'),
        DcInlineError: DcInlineErrorStub,
        DcSubmitButton: DcSubmitButtonStub,
        Input: InputStub,
        Spinner: passthrough('Spinner')
      }
    }
  })
}

describe('SkillInstallDialog', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.deviceClient.selectDirectory.mockResolvedValue({
      canceled: false,
      filePaths: ['C:/skills/demo']
    })
  })

  it('shows the localized reason and the raw installer detail when installation fails', async () => {
    mocks.skillClient.installFromFolder.mockResolvedValue({
      success: false,
      error: 'SKILL.md not found in zip archive',
      errorCode: 'invalid_skill'
    })

    const wrapper = await mountDialog()
    await wrapper.get('.border-dashed').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('settings.skills.install.errors.invalidSkill')
    expect(wrapper.text()).toContain('SKILL.md not found in zip archive')
  })

  it('falls back to the generic reason when the installer reports no error code', async () => {
    mocks.skillClient.installFromFolder.mockResolvedValue({
      success: false,
      error: 'unexpected failure'
    })

    const wrapper = await mountDialog()
    await wrapper.get('.border-dashed').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('settings.skills.install.errors.unknown')
    expect(wrapper.text()).toContain('unexpected failure')
  })
})
